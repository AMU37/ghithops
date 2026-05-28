from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from core import db
from core.models import Employee, User
from .models import (
    ShiftType, Bus, Driver, TransportRoute, EmployeeAssignment,
    ETTrip, TripRoute, RideLog, Violation, EmployeeTransportInfo
)
from datetime import date, time, datetime
from sqlalchemy import or_, distinct
import json

et_bp = Blueprint('employee_transport', __name__, url_prefix='/employee-transport', template_folder='templates')

DRIVER_ALLOWED = {'driver_view', 'board_employee', 'add_employee_manual', 'trip_employees', 'complete_trip', 'start_trip'}

@et_bp.before_request
def check_driver_access():
    if current_user.is_authenticated and current_user.role == 'driver':
        endpoint = request.endpoint
        if endpoint and endpoint.startswith('employee_transport.'):
            action = endpoint.split('.', 1)[1]
            if action not in DRIVER_ALLOWED:
                flash('غير مسموح بالوصول', 'danger')
                return redirect(url_for('employee_transport.driver_view'))

# ==================== لوحة التحكم ====================
@et_bp.route('/')
@et_bp.route('/dashboard')
@login_required
def dashboard():
    cid = current_user.company_id
    buses = Bus.query.filter_by(company_id=cid).count()
    drivers = Driver.query.filter_by(company_id=cid, status='active').count()
    routes = TransportRoute.query.filter_by(company_id=cid, status='active').count()
    assignments = EmployeeAssignment.query.filter_by(company_id=cid, status='active').count()
    today_trips = ETTrip.query.filter_by(company_id=cid, date=date.today()).count()
    violations = Violation.query.filter_by(company_id=cid, resolved=False).count()

    recent_violations = Violation.query.filter_by(company_id=cid).order_by(Violation.date.desc()).limit(10).all()
    today_rides = RideLog.query.join(ETTrip).filter(
        ETTrip.company_id == cid, ETTrip.date == date.today()
    ).count()

    return render_template('employee_transport/dashboard.html',
        buses=buses, drivers=drivers, routes=routes, assignments=assignments,
        today_trips=today_trips, violations=violations,
        recent_violations=recent_violations, today_rides=today_rides)

# ==================== الموظفين (خاص بنشاط النقل) ====================
@et_bp.route('/employees')
@login_required
def et_employees():
    cid = current_user.company_id
    emps = Employee.query.filter(Employee.company_id == cid, ~Employee.code.like('TEMP-%')).order_by(Employee.id.desc()).all()
    et_infos = {e.employee_id: e for e in EmployeeTransportInfo.query.filter_by(company_id=cid).all()}
    shift_types = ShiftType.query.filter_by(company_id=cid, status='active').all()
    routes = TransportRoute.query.filter_by(company_id=cid, status='active').all()
    from .cycle_utils import get_employee_cycle_status
    today = date.today()
    cycle_statuses = {}
    for e in emps:
        info = et_infos.get(e.id)
        if info:
            cycle_statuses[e.id] = get_employee_cycle_status(info, today)
    return render_template('employee_transport/employees.html',
        employees=emps, et_infos=et_infos, et_shift_types=shift_types, et_routes=routes,
        cycle_statuses=cycle_statuses, title='الموظفين - نقل الموظفين')

@et_bp.route('/employees/add', methods=['POST'])
@login_required
def add_et_employee():
    try:
        cid = current_user.company_id
        # auto code
        last = Employee.query.filter(Employee.company_id == cid, Employee.code.like('ET-%')).order_by(Employee.id.desc()).first()
        n = int(last.code.split('-')[1]) if last and last.code and '-' in last.code else 0
        code = f'ET-{n+1:03d}'

        emp = Employee(
            company_id=cid, name=request.form.get('name'),
            code=code, position=request.form.get('position'),
            birth_date=datetime.strptime(request.form.get('birth_date'), '%Y-%m-%d').date() if request.form.get('birth_date') else None,
            birth_place=request.form.get('birth_place'),
            join_date=datetime.strptime(request.form.get('join_date'), '%Y-%m-%d').date() if request.form.get('join_date') else date.today(),
            wage_type='monthly', area=request.form.get('area'), notes=request.form.get('notes')
        )
        db.session.add(emp)
        db.session.flush()

        # save transport info
        dep = request.form.get('et_department', '').strip()
        st_id = request.form.get('et_shift_type_id')
        r_id = request.form.get('et_route_id')
        at = request.form.get('et_arrival_time')
        lv = request.form.get('et_departure_time')
        if dep or st_id or r_id:
            et_info = EmployeeTransportInfo(
                employee_id=emp.id, company_id=cid,
                department=dep or None,
                shift_type_id=int(st_id) if st_id else None,
                shift_start_date=datetime.strptime(request.form.get('et_shift_start_date'), '%Y-%m-%d').date() if request.form.get('et_shift_start_date') else None,
                work_day=request.form.get('et_work_day'),
                movement_status=request.form.get('et_movement_status'),
                arrival_time=datetime.strptime(at, '%H:%M').time() if at else None,
                departure_time=datetime.strptime(lv, '%H:%M').time() if lv else None,
                route_id=int(r_id) if r_id else None,
                external_company=request.form.get('et_external_company'),
                city=request.form.get('et_city'),
                residence_location=request.form.get('et_residence_location'),
                transport_type=request.form.get('et_transport_type', 'ورديات')
            )
            db.session.add(et_info)

        # create user if requested
        if request.form.get('create_user') == 'on':
            username = request.form.get('user_username') or code
            password = request.form.get('user_password') or '123456'
            if not User.query.filter_by(company_id=cid, username=username).first():
                u = User(company_id=cid, username=username, full_name=emp.name, role='user', is_active=True)
                u.set_password(password)
                db.session.add(u)

        db.session.commit()
        flash('تم إضافة الموظف بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ: {str(e)}', 'error')
    return redirect(url_for('employee_transport.et_employees'))

@et_bp.route('/employees/edit/<int:id>', methods=['POST'])
@login_required
def edit_et_employee(id):
    try:
        emp = Employee.query.get(id)
        if not emp or emp.company_id != current_user.company_id:
            flash('الموظف غير موجود', 'error')
            return redirect(url_for('employee_transport.et_employees'))

        emp.name = request.form.get('name', emp.name)
        emp.code = request.form.get('code', emp.code)
        emp.position = request.form.get('position', emp.position)
        emp.birth_date = datetime.strptime(request.form.get('birth_date'), '%Y-%m-%d').date() if request.form.get('birth_date') else emp.birth_date
        emp.birth_place = request.form.get('birth_place', emp.birth_place)
        emp.join_date = datetime.strptime(request.form.get('join_date'), '%Y-%m-%d').date() if request.form.get('join_date') else emp.join_date
        emp.area = request.form.get('area', emp.area)
        emp.notes = request.form.get('notes', emp.notes)
        emp.status = request.form.get('status', emp.status)

        # update transport info
        et_info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
        dep = request.form.get('et_department', '').strip()
        st_id = request.form.get('et_shift_type_id')
        r_id = request.form.get('et_route_id')
        at = request.form.get('et_arrival_time')
        lv = request.form.get('et_departure_time')
        if et_info:
            et_info.department = dep or None
            et_info.shift_type_id = int(st_id) if st_id else None
            et_info.shift_start_date = datetime.strptime(request.form.get('et_shift_start_date'), '%Y-%m-%d').date() if request.form.get('et_shift_start_date') else None
            et_info.work_day = request.form.get('et_work_day')
            et_info.movement_status = request.form.get('et_movement_status')
            et_info.arrival_time = datetime.strptime(at, '%H:%M').time() if at else None
            et_info.departure_time = datetime.strptime(lv, '%H:%M').time() if lv else None
            et_info.route_id = int(r_id) if r_id else None
            et_info.external_company = request.form.get('et_external_company')
            et_info.city = request.form.get('et_city')
            et_info.residence_location = request.form.get('et_residence_location')
            et_info.transport_type = request.form.get('et_transport_type', 'يومي')
        elif dep or st_id or r_id:
            et_info = EmployeeTransportInfo(
                employee_id=emp.id, company_id=emp.company_id,
                department=dep or None,
                shift_type_id=int(st_id) if st_id else None,
                shift_start_date=datetime.strptime(request.form.get('et_shift_start_date'), '%Y-%m-%d').date() if request.form.get('et_shift_start_date') else None,
                work_day=request.form.get('et_work_day'),
                movement_status=request.form.get('et_movement_status'),
                arrival_time=datetime.strptime(at, '%H:%M').time() if at else None,
                departure_time=datetime.strptime(lv, '%H:%M').time() if lv else None,
                route_id=int(r_id) if r_id else None,
                external_company=request.form.get('et_external_company'),
                city=request.form.get('et_city'),
                residence_location=request.form.get('et_residence_location'),
                transport_type=request.form.get('et_transport_type', 'ورديات')
            )
            db.session.add(et_info)

        db.session.commit()
        flash('تم تعديل بيانات الموظف بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ: {str(e)}', 'error')
    return redirect(url_for('employee_transport.et_employees'))

@et_bp.route('/employees/delete/<int:id>', methods=['POST'])
@login_required
def delete_et_employee(id):
    try:
        emp = Employee.query.get(id)
        if emp and emp.company_id == current_user.company_id:
            emp.status = 'deleted'
            # also delete transport info
            et_info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
            if et_info:
                db.session.delete(et_info)
            db.session.commit()
            flash('تم حذف الموظف بنجاح', 'success')
        else:
            flash('الموظف غير موجود', 'error')
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ: {str(e)}', 'error')
    return redirect(url_for('employee_transport.et_employees'))

@et_bp.route('/employees/api/<int:id>')
@login_required
def api_et_employee(id):
    emp = Employee.query.get(id)
    if not emp or emp.company_id != current_user.company_id:
        return jsonify({})
    return jsonify({
        'id': emp.id, 'name': emp.name, 'card_number': emp.card_number or '',
        'code': emp.code or '', 'position': emp.position or '',
        'birth_date': str(emp.birth_date) if emp.birth_date else '',
        'birth_place': emp.birth_place or '',
        'join_date': str(emp.join_date) if emp.join_date else '',
        'area': emp.area or '', 'notes': emp.notes or '', 'status': emp.status,
        'et_department': emp.et_info.department if emp.et_info else '',
        'et_shift_type_id': emp.et_info.shift_type_id if emp.et_info else '',
        'et_shift_start_date': str(emp.et_info.shift_start_date) if emp.et_info and emp.et_info.shift_start_date else '',
        'et_work_day': emp.et_info.work_day if emp.et_info else '',
        'et_movement_status': emp.et_info.movement_status if emp.et_info else '',
        'et_arrival_time': str(emp.et_info.arrival_time)[:5] if emp.et_info and emp.et_info.arrival_time else '',
        'et_departure_time': str(emp.et_info.departure_time)[:5] if emp.et_info and emp.et_info.departure_time else '',
        'et_route_id': emp.et_info.route_id if emp.et_info else '',
        'et_external_company': emp.et_info.external_company if emp.et_info else '',
        'et_city': emp.et_info.city if emp.et_info else '',
        'et_residence_location': emp.et_info.residence_location if emp.et_info else '',
        'et_transport_type': emp.et_info.transport_type if emp.et_info else 'يومي'
    })

# ==================== أنواع الدوام ====================
@et_bp.route('/shift-types')
@login_required
def shift_types():
    types = ShiftType.query.filter_by(company_id=current_user.company_id).all()
    return render_template('employee_transport/shift_types.html', shift_types=types)

@et_bp.route('/shift-types/add', methods=['POST'])
@login_required
def add_shift_type():
    try:
        st = ShiftType(
            company_id=current_user.company_id, name=request.form.get('name'),
            description=request.form.get('description'),
            work_days=int(request.form.get('work_days') or 6),
            vacation_days=int(request.form.get('vacation_days') or 1))
        db.session.add(st)
        db.session.commit()
        flash('تم إضافة نوع الدوام بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.shift_types'))

@et_bp.route('/shift-types/api/<int:id>')
@login_required
def api_shift_type(id):
    st = ShiftType.query.filter_by(id=id, company_id=current_user.company_id).first()
    if not st:
        return jsonify({})
    return jsonify({
        'id': st.id, 'name': st.name, 'description': st.description or '',
        'work_days': st.work_days or 6, 'vacation_days': st.vacation_days or 1,
        'status': st.status
    })

@et_bp.route('/shift-types/edit/<int:id>', methods=['POST'])
@login_required
def edit_shift_type(id):
    st = ShiftType.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    try:
        st.name = request.form.get('name', st.name)
        st.description = request.form.get('description', st.description)
        st.work_days = int(request.form.get('work_days') or st.work_days or 6)
        st.vacation_days = int(request.form.get('vacation_days') or st.vacation_days or 1)
        st.status = request.form.get('status', st.status)
        db.session.commit()
        flash('تم تعديل نوع الدوام', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.shift_types'))

@et_bp.route('/shift-types/delete/<int:id>', methods=['POST'])
@login_required
def delete_shift_type(id):
    st = ShiftType.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    db.session.delete(st); db.session.commit()
    flash('تم الحذف', 'success')
    return redirect(url_for('employee_transport.shift_types'))

# ==================== الباصات ====================
@et_bp.route('/buses')
@login_required
def buses():
    all_buses = Bus.query.filter_by(company_id=current_user.company_id).all()
    return render_template('employee_transport/buses.html', buses=all_buses)

@et_bp.route('/buses/add', methods=['POST'])
@login_required
def add_bus():
    try:
        bus = Bus(company_id=current_user.company_id, plate_number=request.form.get('plate_number'),
                  capacity=int(request.form.get('capacity', 30)), model=request.form.get('model'),
                  color=request.form.get('color'), notes=request.form.get('notes'))
        db.session.add(bus); db.session.commit()
        flash('تم إضافة الباص بنجاح', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.buses'))

@et_bp.route('/buses/edit/<int:id>', methods=['POST'])
@login_required
def edit_bus(id):
    bus = Bus.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    try:
        bus.plate_number = request.form.get('plate_number')
        bus.capacity = int(request.form.get('capacity', 30))
        bus.model = request.form.get('model')
        bus.color = request.form.get('color')
        bus.status = request.form.get('status', 'active')
        bus.notes = request.form.get('notes')
        db.session.commit(); flash('تم التحديث', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.buses'))

@et_bp.route('/buses/delete/<int:id>', methods=['POST'])
@login_required
def delete_bus(id):
    bus = Bus.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    db.session.delete(bus); db.session.commit()
    flash('تم الحذف', 'success')
    return redirect(url_for('employee_transport.buses'))

# ==================== السائقين ====================
@et_bp.route('/drivers')
@login_required
def drivers():
    all_drivers = Driver.query.filter_by(company_id=current_user.company_id).all()
    employees = Employee.query.filter_by(company_id=current_user.company_id, status='active').all()
    users = User.query.filter_by(company_id=current_user.company_id).all()
    return render_template('employee_transport/drivers.html', drivers=all_drivers, employees=employees, users=users)

@et_bp.route('/drivers/add', methods=['POST'])
@login_required
def add_driver():
    try:
        uname = request.form.get('username', '').strip()
        pwd = request.form.get('password', '').strip()
        emp_id = request.form.get('employee_id')
        d = Driver(company_id=current_user.company_id, name=request.form.get('name'),
                   phone=request.form.get('phone'), license_number=request.form.get('license_number'),
                   employee_id=int(emp_id) if emp_id else None,
                   username=uname or None, notes=request.form.get('notes'))
        if uname and pwd:
            existing = User.query.filter_by(company_id=current_user.company_id, username=uname).first()
            if existing: raise Exception('اسم المستخدم موجود مسبقاً')
            u = User(company_id=current_user.company_id, username=uname,
                     full_name=request.form.get('name'), role='driver', is_active=True)
            u.set_password(pwd)
            db.session.add(u); db.session.flush()
            d.user_id = u.id
        db.session.add(d); db.session.commit()
        flash('تم إضافة السائق بنجاح', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.drivers'))

@et_bp.route('/drivers/edit/<int:id>', methods=['POST'])
@login_required
def edit_driver(id):
    d = Driver.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    try:
        uname = request.form.get('username', '').strip()
        pwd = request.form.get('password', '').strip()
        emp_id = request.form.get('employee_id')
        d.name = request.form.get('name'); d.phone = request.form.get('phone')
        d.license_number = request.form.get('license_number')
        d.employee_id = int(emp_id) if emp_id else None
        d.status = request.form.get('status', 'active'); d.notes = request.form.get('notes')
        d.username = uname or None
        if uname and pwd and not d.user_id:
            existing = User.query.filter_by(company_id=current_user.company_id, username=uname).first()
            if existing: raise Exception('اسم المستخدم موجود مسبقاً')
            u = User(company_id=current_user.company_id, username=uname,
                     full_name=request.form.get('name'), role='driver', is_active=True)
            u.set_password(pwd)
            db.session.add(u); db.session.flush()
            d.user_id = u.id
        elif uname and pwd and d.user_id:
            u = User.query.get(d.user_id)
            if u and u.username != uname:
                existing = User.query.filter_by(company_id=current_user.company_id, username=uname).first()
                if existing: raise Exception('اسم المستخدم موجود مسبقاً')
            if u: u.username = uname; u.set_password(pwd)
        elif d.user_id and not uname:
            u = User.query.get(d.user_id)
            if u: db.session.delete(u); d.user_id = None
        db.session.commit(); flash('تم التحديث', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.drivers'))

@et_bp.route('/drivers/delete/<int:id>', methods=['POST'])
@login_required
def delete_driver(id):
    d = Driver.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    if d.user_id: db.session.delete(User.query.get(d.user_id))
    db.session.delete(d); db.session.commit()
    flash('تم الحذف', 'success')
    return redirect(url_for('employee_transport.drivers'))

# ==================== خطوط السير ====================
@et_bp.route('/routes')
@login_required
def routes():
    cid = current_user.company_id
    all_routes = TransportRoute.query.filter_by(company_id=cid).all()
    shift_types = ShiftType.query.filter_by(company_id=cid, status='active').all()
    buses = Bus.query.filter_by(company_id=cid, status='active').all()
    drivers = Driver.query.filter_by(company_id=cid, status='active').all()
    return render_template('employee_transport/routes.html', routes=all_routes,
                          shift_types=shift_types, buses=buses, drivers=drivers)

@et_bp.route('/routes/add', methods=['POST'])
@login_required
def add_route():
    try:
        dep = request.form.get('departure_time'); ret = request.form.get('return_time')
        work_days = request.form.getlist('work_days')
        r = TransportRoute(company_id=current_user.company_id, name=request.form.get('name'),
            area=request.form.get('area'),
            departure_time=datetime.strptime(dep, '%H:%M').time() if dep else time(8, 0),
            return_time=datetime.strptime(ret, '%H:%M').time() if ret else time(17, 0),
            work_days=json.dumps([int(d) for d in work_days]),
            shift_type_id=request.form.get('shift_type_id') or None,
            bus_id=request.form.get('bus_id') or None,
            driver_id=request.form.get('driver_id') or None,
            notes=request.form.get('notes'))
        db.session.add(r); db.session.commit()
        flash('تم إضافة الخط بنجاح', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.routes'))

@et_bp.route('/routes/edit/<int:id>', methods=['POST'])
@login_required
def edit_route(id):
    r = TransportRoute.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    try:
        dep = request.form.get('departure_time'); ret = request.form.get('return_time')
        work_days = request.form.getlist('work_days')
        r.name = request.form.get('name'); r.area = request.form.get('area')
        r.departure_time = datetime.strptime(dep, '%H:%M').time() if dep else r.departure_time
        r.return_time = datetime.strptime(ret, '%H:%M').time() if ret else r.return_time
        r.work_days = json.dumps([int(d) for d in work_days]) if work_days else r.work_days
        r.shift_type_id = request.form.get('shift_type_id') or None
        r.bus_id = request.form.get('bus_id') or None
        r.driver_id = request.form.get('driver_id') or None
        r.status = request.form.get('status', 'active'); r.notes = request.form.get('notes')
        db.session.commit(); flash('تم التحديث', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.routes'))

@et_bp.route('/routes/delete/<int:id>', methods=['POST'])
@login_required
def delete_route(id):
    r = TransportRoute.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    db.session.delete(r); db.session.commit()
    flash('تم الحذف', 'success')
    return redirect(url_for('employee_transport.routes'))

# ==================== تعيين الموظفين ====================
@et_bp.route('/assignments')
@login_required
def assignments():
    cid = current_user.company_id
    report_date = request.args.get('report_date', date.today().isoformat())
    try: report_date = datetime.strptime(report_date, '%Y-%m-%d').date()
    except: report_date = date.today()

    q = EmployeeTransportInfo.query.filter_by(company_id=cid)
    st = request.args.get('shift_type')
    if st: q = q.filter_by(shift_type_id=int(st))
    rid = request.args.get('route_id')
    if rid: q = q.filter_by(route_id=int(rid))
    infos = q.all()
    # Exclude TEMP employees (no transport info record for them)
    infos = [i for i in infos if i.employee and i.employee.code and not i.employee.code.startswith('TEMP-')]

    # filter by today's status
    today_filter = request.args.get('today_status')
    from .cycle_utils import get_employee_cycle_status
    cycle_statuses = {}
    filtered = []
    for info in infos:
        cs = get_employee_cycle_status(info, report_date)
        cycle_statuses[info.employee_id] = cs
        if not today_filter or (cs and cs['status'] == today_filter):
            filtered.append(info)
    infos = filtered

    employees = Employee.query.filter_by(company_id=cid, status='active').all()
    routes = TransportRoute.query.filter_by(company_id=cid, status='active').all()
    shift_types = ShiftType.query.filter_by(company_id=cid, status='active').all()
    return render_template('employee_transport/assignments.html', infos=infos,
                          employees=employees, routes=routes, shift_types=shift_types,
                          cycle_statuses=cycle_statuses, report_date=report_date.isoformat())

@et_bp.route('/assignments/add', methods=['POST'])
@login_required
def add_assignment():
    try:
        a = EmployeeAssignment(company_id=current_user.company_id,
            employee_id=request.form.get('employee_id'),
            route_id=request.form.get('route_id'),
            shift_type_id=request.form.get('shift_type_id') or None,
            is_residential=bool(request.form.get('is_residential')),
            start_date=datetime.strptime(request.form.get('start_date'), '%Y-%m-%d').date() if request.form.get('start_date') else None,
            end_date=datetime.strptime(request.form.get('end_date'), '%Y-%m-%d').date() if request.form.get('end_date') else None)
        db.session.add(a); db.session.commit()
        flash('تم تعيين الموظف بنجاح', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.assignments'))

@et_bp.route('/assignments/toggle-status/<int:id>', methods=['POST'])
@login_required
def toggle_assignment(id):
    a = EmployeeAssignment.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    a.status = 'suspended' if a.status == 'active' else 'active'
    db.session.commit()
    flash('تم تغيير الحالة', 'success')
    return redirect(url_for('employee_transport.assignments'))

@et_bp.route('/assignments/transfer-to-trips', methods=['POST'])
@login_required
def transfer_assignments_to_trips():
    """Create one trip per route, link employees via RideLog.
    Merging routes is done manually on the trips page."""
    try:
        data = request.get_json()
        rows = data.get('rows', [])
        trip_date = data.get('date', '')
        try: trip_date = datetime.strptime(trip_date, '%Y-%m-%d').date() if trip_date else date.today()
        except: trip_date = date.today()

        cid = current_user.company_id
        route_groups = {}
        route_cache = {}
        for row in rows:
            parts = row.split('|')
            if len(parts) < 3: continue
            emp_id = int(parts[0].strip())
            route_name = parts[2].strip()
            if not route_name: continue
            if route_name not in route_cache:
                r = TransportRoute.query.filter_by(company_id=cid, name=route_name).first()
                if not r: continue
                route_cache[route_name] = r
            route_groups.setdefault(route_name, []).append(emp_id)

        created, linked = 0, 0
        for route_name, emp_ids in route_groups.items():
            route = route_cache[route_name]
            trip = ETTrip.query.filter_by(company_id=cid, route_id=route.id, date=trip_date).first()
            if not trip:
                trip = ETTrip(company_id=cid, route_id=route.id, date=trip_date,
                              bus_id=route.bus_id, driver_id=route.driver_id,
                              departure_time=route.departure_time, return_time=route.return_time)
                db.session.add(trip)
                db.session.flush()
                created += 1
            for emp_id in emp_ids:
                if not RideLog.query.filter_by(company_id=cid, trip_id=trip.id, employee_id=emp_id, action='assigned').first():
                    db.session.add(RideLog(company_id=cid, trip_id=trip.id, employee_id=emp_id, action='assigned'))
                    linked += 1

        db.session.commit()
        parts = []
        if created: parts.append(f'تم إنشاء {created} رحلة')
        if linked: parts.append(f'تم ربط {linked} موظف بالرحلات')
        msg = '، '.join(parts) if parts else 'لم يتم العثور على خطوط سير للموظفين المفلترين'
        return jsonify({'success': True, 'message': msg, 'date': trip_date.isoformat()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})


@et_bp.route('/trips/merge', methods=['POST'])
@login_required
def merge_trips():
    """Merge multiple trips into one multi-route trip."""
    try:
        data = request.get_json()
        trip_ids = data.get('trip_ids', [])
        if len(trip_ids) < 2:
            return jsonify({'success': False, 'message': 'يجب اختيار رحلتين على الأقل'})

        cid = current_user.company_id
        trips = ETTrip.query.filter(ETTrip.id.in_(trip_ids), ETTrip.company_id == cid).all()
        if len(trips) < 2:
            return jsonify({'success': False, 'message': 'الرحلات المختارة غير موجودة'})

        # Keep the first trip as the main trip, merge others into it
        main = trips[0]
        merged_any = False
        for other in trips[1:]:
            if other.id == main.id: continue
            # Add other's routes to main via TripRoute
            other_routes = [other.route_id]
            for tr in (other.trip_routes or []):
                if tr.route_id not in other_routes:
                    other_routes.append(tr.route_id)
            for rid in other_routes:
                if rid != main.route_id:
                    if not TripRoute.query.filter_by(trip_id=main.id, route_id=rid).first():
                        db.session.add(TripRoute(trip_id=main.id, route_id=rid, order=0))
            # Move employees (RideLog) from other to main
            for rl in RideLog.query.filter_by(trip_id=other.id).all():
                if not RideLog.query.filter_by(trip_id=main.id, employee_id=rl.employee_id, action=rl.action).first():
                    rl.trip_id = main.id
            # Move violations
            for v in Violation.query.filter_by(trip_id=other.id).all():
                v.trip_id = main.id
            # Delete TripRoute entries of the other trip
            TripRoute.query.filter_by(trip_id=other.id).delete()
            # Delete the other trip
            db.session.delete(other)
            merged_any = True

        if not merged_any:
            return jsonify({'success': False, 'message': 'لا توجد رحلات إضافية للدمج'})

        # Adjust departure/return time to cover all routes
        all_route_ids = [main.route_id] + [tr.route_id for tr in (main.trip_routes or [])]
        routes = TransportRoute.query.filter(TransportRoute.id.in_(all_route_ids)).all()
        if routes:
            main.departure_time = min(r.departure_time for r in routes)
            main.return_time = max(r.return_time for r in routes)

        db.session.commit()
        return jsonify({'success': True, 'message': f'تم دمج {len(trips)} رحلة في رحلة واحدة'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

# ==================== رحلات اليوم ====================
@et_bp.route('/trips')
@login_required
def trips():
    cid = current_user.company_id
    today = date.today()
    trip_date = request.args.get('date', today.isoformat())
    try:
        trip_date = datetime.strptime(trip_date, '%Y-%m-%d').date()
    except:
        trip_date = today
    show_archived = request.args.get('show_archived', '0') == '1'
    status_filter = ['scheduled', 'in_progress']
    if show_archived: status_filter.append('completed')
    all_trips = ETTrip.query.filter_by(company_id=cid, date=trip_date)\
        .filter(ETTrip.status.in_(status_filter))\
        .order_by(ETTrip.departure_time).all()
    routes = TransportRoute.query.filter_by(company_id=cid, status='active').all()
    buses = Bus.query.filter_by(company_id=cid, status='active').all()
    drivers = Driver.query.filter_by(company_id=cid, status='active').all()
    # employees from ride logs (assigned via transfer)
    from .cycle_utils import get_employee_cycle_status
    trip_ids = [t.id for t in all_trips]
    if trip_ids:
        all_ride_logs = RideLog.query.filter(RideLog.company_id == cid, RideLog.trip_id.in_(trip_ids)).all()
        assigned_emp_ids = set(r.employee_id for r in all_ride_logs)
        emp_infos = EmployeeTransportInfo.query.filter(EmployeeTransportInfo.company_id == cid, EmployeeTransportInfo.employee_id.in_(assigned_emp_ids)).all() if assigned_emp_ids else []
    else:
        all_ride_logs = []; assigned_emp_ids = set(); emp_infos = []
    info_by_emp = {info.employee_id: info for info in emp_infos}
    trip_employees = {}   # trip_id -> list of employees
    trip_routes_map = {}  # trip_id -> list of route names
    bus_suggestions = {}  # trip_id -> {count, capacity_needed, suggestion}
    for trip in all_trips:
        logs = [r for r in all_ride_logs if r.trip_id == trip.id]
        emps = []
        for rl in logs:
            info = info_by_emp.get(rl.employee_id)
            if not info: continue
            cs = get_employee_cycle_status(info, trip_date)
            emps.append({
                'name': info.employee.name if info.employee else '-',
                'department': info.department or '',
                'arrival': info.arrival_time.strftime('%H:%M') if info.arrival_time else '',
                'status': cs['label'] if cs else '-',
                'status_color': cs['color'] if cs else 'secondary',
            })
        trip_employees[trip.id] = emps
        # Collect all routes for this trip
        rnames = [trip.route.name] if trip.route else []
        for tr in (trip.trip_routes or []):
            if tr.route and tr.route.name not in rnames:
                rnames.append(tr.route.name)
        trip_routes_map[trip.id] = rnames
        # Bus suggestion
        emp_count = len(emps)
        bus_suggestions[trip.id] = {
            'count': emp_count,
            'capacity_needed': emp_count,
            'buses_available': len([b for b in buses if b.status == 'active']),
        }

    return render_template('employee_transport/trips.html', trips=all_trips, routes=routes,
                          buses=buses, drivers=drivers, trip_employees=trip_employees,
                          trip_routes_map=trip_routes_map, bus_suggestions=bus_suggestions,
                          trip_date=trip_date, today=today, show_archived=show_archived)

@et_bp.route('/trips/create', methods=['POST'])
@login_required
def create_trip():
    route_id = request.form.get('route_id', type=int)
    if not route_id:
        flash('الرجاء اختيار خط السير', 'danger')
        return redirect(url_for('employee_transport.trips'))
    route = TransportRoute.query.filter_by(id=route_id, company_id=current_user.company_id).first()
    if not route:
        flash('خط السير غير موجود', 'danger')
        return redirect(url_for('employee_transport.trips'))
    try:
        t = ETTrip(company_id=current_user.company_id, route_id=route.id,
                 bus_id=route.bus_id, driver_id=route.driver_id,
                 date=datetime.strptime(request.form.get('date'), '%Y-%m-%d').date() if request.form.get('date') else date.today(),
                 departure_time=route.departure_time, return_time=route.return_time)
        db.session.add(t); db.session.commit()
        flash('تم إنشاء الرحلة', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.trips'))

@et_bp.route('/trips/assign-resources/<int:id>', methods=['POST'])
@login_required
def assign_trip_resources(id):
    t = ETTrip.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    try:
        t.bus_id = int(request.form.get('bus_id'))
        t.driver_id = int(request.form.get('driver_id'))
        db.session.commit()
        flash('تم ترحيل الرحلة للسائق', 'success')
    except Exception as e:
        db.session.rollback(); flash(f'خطأ: {str(e)}', 'danger')
    return redirect(url_for('employee_transport.trips', date=t.date.isoformat()))

@et_bp.route('/trips/clear', methods=['POST'])
@login_required
def clear_trips():
    date_str = request.form.get('date', date.today().isoformat())
    try: clear_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except: clear_date = date.today()
    cid = current_user.company_id
    trips = ETTrip.query.filter_by(company_id=cid, date=clear_date).all()
    trip_ids = [t.id for t in trips]
    if trip_ids:
        TripRoute.query.filter(TripRoute.trip_id.in_(trip_ids)).delete(synchronize_session=False)
        RideLog.query.filter(RideLog.trip_id.in_(trip_ids)).delete(synchronize_session=False)
        for t in trips: db.session.delete(t)
        db.session.commit()
        flash(f'تم مسح {len(trips)} رحلة لتاريخ {clear_date.isoformat()}', 'success')
    else:
        flash('لا توجد رحلات لهذا التاريخ', 'info')
    return redirect(url_for('employee_transport.assignments'))

@et_bp.route('/trips/start/<int:id>', methods=['POST'])
@login_required
def start_trip(id):
    t = ETTrip.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    t.status = 'in_progress'
    t.started_at = datetime.utcnow()
    db.session.commit(); flash('بدأت الرحلة', 'success')
    if current_user.role == 'driver':
        return redirect(url_for('employee_transport.driver_view'))
    return redirect(url_for('employee_transport.trips'))

@et_bp.route('/trips/complete/<int:id>', methods=['POST'])
@login_required
def complete_trip(id):
    t = ETTrip.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    t.status = 'completed'
    t.completed_at = datetime.utcnow()
    db.session.commit()
    if current_user.role == 'driver':
        return redirect(url_for('employee_transport.driver_view'))
    return redirect(url_for('employee_transport.trips'))

# ==================== تسجيل الصعود (واجهة السائق) ====================
@et_bp.route('/driver-view')
@login_required
def driver_view():
    cid = current_user.company_id
    today = date.today()
    driver = Driver.query.filter_by(company_id=cid, user_id=current_user.id).first() if current_user.role == 'driver' else None
    if driver:
        trips_today = ETTrip.query.filter_by(company_id=cid, date=today, driver_id=driver.id).order_by(ETTrip.departure_time).all()
    else:
        trips_today = ETTrip.query.filter_by(company_id=cid, date=today).order_by(ETTrip.departure_time).all()
    # Collect all assigned employees per trip
    from .cycle_utils import get_employee_cycle_status
    trip_ids = [t.id for t in trips_today]
    trip_employees = {}
    if trip_ids:
        logs = RideLog.query.filter(RideLog.trip_id.in_(trip_ids), RideLog.company_id == cid).all()
        emp_ids = set(l.employee_id for l in logs)
        emp_infos = EmployeeTransportInfo.query.filter(EmployeeTransportInfo.company_id == cid, EmployeeTransportInfo.employee_id.in_(emp_ids)).all() if emp_ids else []
        info_by_emp = {info.employee_id: info for info in emp_infos}
        for t in trips_today:
            trip_logs = [l for l in logs if l.trip_id == t.id]
            assigned = [l for l in trip_logs if l.action == 'assigned']
            boarded_ids = set(l.employee_id for l in trip_logs if l.action == 'board')
            all_relevant_ids = set(l.employee_id for l in trip_logs if l.action in ('assigned', 'board'))
            emp_dict = {}  # employee_id -> record for main manifest
            boarded_records = []  # all boarded employees (including TEMP) for boarded section
            for l in trip_logs:
                if l.action not in ('assigned', 'board'): continue
                eid = l.employee_id
                if eid in emp_dict: continue
                emp = l.employee
                emp_code = emp.code if emp else '-'
                is_temp = emp_code and emp_code.startswith('TEMP-')
                info = info_by_emp.get(eid)
                cs = get_employee_cycle_status(info, today) if info else None
                is_boarded = eid in boarded_ids
                route_mismatch = False
                original_route = ''
                if not is_temp and info and info.route and t.route and info.route_id != t.route_id:
                    route_mismatch = True
                    original_route = info.route.name
                if is_boarded:
                    if is_temp:
                        final_status, final_color = 'مضاف', 'primary'
                    elif route_mismatch:
                        final_status, final_color = f'مطابق (استثناء)', 'warning'
                    else:
                        final_status, final_color = 'مطابق', 'success'
                else:
                    final_status, final_color = '-', 'secondary'
                record = {
                    'id': emp.id if emp else '-',
                    'code': emp_code,
                    'name': emp.name if emp else '-',
                    'job': emp.position if emp and emp.position else '-',
                    'department': info.department if info else '-',
                    'company': info.external_company if info and info.external_company else '-',
                    'shift_type': info.shift_type.name if info and info.shift_type else '-',
                    'work_day': (cs['position_in_cycle'] + 1) if cs else '-',
                    'work_date': info.shift_start_date.strftime('%Y-%m-%d') if info and info.shift_start_date else '-',
                    'today_status': cs['label'] if cs else '-',
                    'status_color': cs['color'] if cs else 'secondary',
                    'boarded': is_boarded,
                    'final_status': final_status,
                    'final_color': final_color,
                    'route_mismatch': route_mismatch,
                    'original_route': original_route,
                }
                # Add to boarded_records for all boarded employees
                if is_boarded:
                    boarded_records.append(record)
                # Skip TEMP employees from main manifest
                if not is_temp:
                    emp_dict[eid] = record
            trip_employees[t.id] = {
                'employees': list(emp_dict.values()),
                'boarded_employees': boarded_records,
                'total_assigned': len(assigned),
                'total_boarded': len(boarded_ids),
            }
    driver_routes = TransportRoute.query.filter_by(company_id=cid, status='active').all()
    return render_template('employee_transport/driver_view.html', trips=trips_today,
                          routes=driver_routes, today=today, current_driver=driver,
                          trip_employees=trip_employees)

@et_bp.route('/driver/board', methods=['POST'])
@login_required
def board_employee():
    try:
        trip_id = request.form.get('trip_id')
        employee_code = request.form.get('employee_code', '').strip()
        action = request.form.get('action', 'board')

        trip = ETTrip.query.filter_by(id=trip_id, company_id=current_user.company_id).first()
        if not trip:
            return jsonify({'success': False, 'message': 'الرحلة غير موجودة'})
        if trip.status != 'in_progress':
            return jsonify({'success': False, 'message': 'يجب بدء الرحلة أولاً'})

        # Find employee by code or name
        emp = Employee.query.filter(
            Employee.company_id == current_user.company_id,
            or_(Employee.code == employee_code, Employee.name.contains(employee_code))
        ).first()

        is_today_plan = False
        warning = None

        if emp:
            # Check if already boarded/disembarked on this trip
            existing_log = RideLog.query.filter_by(trip_id=trip.id, employee_id=emp.id, action=action).first()
            if existing_log:
                return jsonify({'success': False, 'message': f'{emp.name} مسجل مسبقاً في هذه الرحلة'})
            # For board action: check if boarded on ANY other trip today
            if action == 'board':
                already_boarded = RideLog.query.join(ETTrip).filter(
                    RideLog.company_id == current_user.company_id,
                    RideLog.employee_id == emp.id,
                    RideLog.action == 'board',
                    RideLog.trip_id != trip.id,
                    ETTrip.date == trip.date
                ).first()
                if already_boarded:
                    return jsonify({'success': False, 'message': f'{emp.name} مسجل في رحلة أخرى اليوم'})

            is_today_plan = RideLog.query.filter_by(trip_id=trip.id, employee_id=emp.id, action='assigned').count() > 0

            if not is_today_plan:
                warning = f'تحذير: {emp.name} غير مدرج ضمن خطة اليوم'
        else:
            # Allow adding employee manually (not in system)
            return jsonify({
                'success': False, 'message': 'الموظف غير موجود في النظام',
                'not_found': True, 'code': employee_code
            })

        log = RideLog(company_id=current_user.company_id, trip_id=trip.id,
                     employee_id=emp.id, action=action, method='manual', status='on_time')
        db.session.add(log); db.session.commit()
        msg = f'تم تسجيل {emp.name}'
        if warning: msg = warning + ' - تم التسجيل'
        return jsonify({'success': True, 'message': msg, 'employee': emp.name, 'warning': warning,
                        'is_today_plan': is_today_plan})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})


@et_bp.route('/driver/add-manual', methods=['POST'])
@login_required
def add_employee_manual():
    """Manually add an employee not in the system to a trip."""
    try:
        trip_id = request.form.get('trip_id')
        emp_name = request.form.get('employee_name', '').strip()
        company_name = request.form.get('company', '').strip()
        position = request.form.get('position', '').strip()
        action = request.form.get('action', 'board')

        if not emp_name:
            return jsonify({'success': False, 'message': 'الرجاء إدخال اسم الموظف'})

        trip = ETTrip.query.filter_by(id=trip_id, company_id=current_user.company_id).first()
        if not trip:
            return jsonify({'success': False, 'message': 'الرحلة غير موجودة'})

        # Check if employee already exists with this name
        cid = current_user.company_id
        existing_emp = Employee.query.filter_by(company_id=cid, name=emp_name).first()
        if existing_emp:
            emp = existing_emp
        else:
            emp = Employee(company_id=cid, name=emp_name,
                          position=position or None,
                          code=f'TEMP-{int(datetime.utcnow().timestamp())}', status='active')
            db.session.add(emp)
            db.session.flush()

        # Save company and position to transport info if this is a new TEMP employee
        if company_name or position:
            info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
            if not info:
                info = EmployeeTransportInfo(employee_id=emp.id, company_id=cid,
                                            external_company=company_name or None)
                db.session.add(info)
            else:
                if company_name: info.external_company = company_name
            if position: emp.position = position

        log = RideLog(company_id=cid, trip_id=trip.id, employee_id=emp.id,
                     action=action, method='manual', status='on_time')
        db.session.add(log)
        db.session.commit()
        return jsonify({'success': True, 'message': f'تم إضافة {emp_name} وتسجيله', 'employee_id': emp.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@et_bp.route('/trip/employees/<int:trip_id>')
@login_required
def trip_employees(trip_id):
    trip = ETTrip.query.filter_by(id=trip_id, company_id=current_user.company_id).first_or_404()
    logs = RideLog.query.filter_by(trip_id=trip.id).order_by(RideLog.time).all()
    assigned_ids = set(r.employee_id for r in logs if r.action == 'assigned')
    total_assigned = RideLog.query.filter_by(trip_id=trip.id, action='assigned').count()
    total_boarded = RideLog.query.filter_by(trip_id=trip.id, action='board').count()
    result_logs = []
    for l in logs:
        emp = l.employee
        emp_code = emp.code if emp else '-'
        emp_name = emp.name if emp else '-'
        if l.action in ('board', 'disembark'):
            if emp_code and emp_code.startswith('TEMP-'):
            # Manual addition
                final_status = 'مضاف'
                final_color = 'primary'
            elif l.employee_id in assigned_ids:
                final_status = 'مطابق'
                final_color = 'success'
            else:
                final_status = 'مخالف'
                final_color = 'danger'
        else:
            final_status = '-'
            final_color = 'secondary'
        result_logs.append({
            'id': l.id, 'employee': emp_name, 'code': emp_code,
            'action': l.action,
            'time': l.time.strftime('%H:%M') if l.time else '-',
            'status': l.status,
            'final_status': final_status,
            'final_color': final_color,
        })
    return jsonify({
        'logs': result_logs,
        'total_assigned': total_assigned,
        'total_boarded': total_boarded
    })

# ==================== المخالفات ====================
@et_bp.route('/violations')
@login_required
def violations():
    cid = current_user.company_id
    all_v = Violation.query.filter_by(company_id=cid).order_by(Violation.date.desc()).all()
    return render_template('employee_transport/violations.html', violations=all_v)

@et_bp.route('/violations/resolve/<int:id>', methods=['POST'])
@login_required
def resolve_violation(id):
    v = Violation.query.filter_by(id=id, company_id=current_user.company_id).first_or_404()
    v.resolved = True; v.resolved_by = current_user.id; v.resolved_at = datetime.utcnow()
    v.notes = request.form.get('notes', v.notes)
    db.session.commit(); flash('تم حل المخالفة', 'success')
    return redirect(url_for('employee_transport.violations'))

# ==================== التقارير ====================
@et_bp.route('/reports')
@login_required
def reports():
    cid = current_user.company_id
    from_date = request.args.get('from', date.today().isoformat())
    to_date = request.args.get('to', date.today().isoformat())
    try:
        fd = datetime.strptime(from_date, '%Y-%m-%d').date()
        td = datetime.strptime(to_date, '%Y-%m-%d').date()
    except:
        fd = td = date.today()

    trips_count = ETTrip.query.filter(ETTrip.company_id == cid, ETTrip.date >= fd, ETTrip.date <= td).count()
    total_rides = RideLog.query.join(ETTrip).filter(
        ETTrip.company_id == cid, ETTrip.date >= fd, ETTrip.date <= td).count()
    violations_count = Violation.query.filter(
        Violation.company_id == cid, Violation.date >= fd, Violation.date <= td).count()
    buses_used = db.session.query(distinct(ETTrip.bus_id)).filter(
        ETTrip.company_id == cid, ETTrip.date >= fd, ETTrip.date <= td).count()

    daily_stats = db.session.query(
        ETTrip.date, db.func.count(ETTrip.id).label('trips'),
        db.func.count(RideLog.id).label('rides')
    ).outerjoin(RideLog).filter(
        ETTrip.company_id == cid, ETTrip.date >= fd, ETTrip.date <= td
    ).group_by(ETTrip.date).all()

    return render_template('employee_transport/reports.html',
        from_date=from_date, to_date=to_date,
        trips_count=trips_count, total_rides=total_rides,
        violations_count=violations_count, buses_used=buses_used,
        daily_stats=daily_stats)

@et_bp.route('/trip-reports')
@login_required
def trip_reports():
    """Supervisor trip comparison report — shows completed trips with assigned vs boarded."""
    from .cycle_utils import get_employee_cycle_status
    cid = current_user.company_id
    today = date.today()
    from_date = request.args.get('from', today.isoformat())
    to_date = request.args.get('to', today.isoformat())
    try:
        fd = datetime.strptime(from_date, '%Y-%m-%d').date()
        td = datetime.strptime(to_date, '%Y-%m-%d').date()
    except:
        fd = td = today

    route_id = request.args.get('route_id', type=int)
    driver_id = request.args.get('driver_id', type=int)

    q = ETTrip.query.filter(ETTrip.company_id == cid, ETTrip.date >= fd, ETTrip.date <= td)
    if route_id:
        q = q.filter(ETTrip.route_id == route_id)
    if driver_id:
        q = q.filter(ETTrip.driver_id == driver_id)
    # Only show trips that have been started (driver interacted with them)
    q = q.filter(ETTrip.status.in_(['in_progress', 'completed']))
    trips = q.order_by(ETTrip.date.desc(), ETTrip.departure_time).all()

    # Collect all employee IDs across all trip logs
    trip_ids = [t.id for t in trips]
    all_logs = RideLog.query.filter(RideLog.trip_id.in_(trip_ids), RideLog.company_id == cid).all() if trip_ids else []
    all_emp_ids = set(l.employee_id for l in all_logs)
    emp_infos = EmployeeTransportInfo.query.filter(EmployeeTransportInfo.company_id == cid, EmployeeTransportInfo.employee_id.in_(all_emp_ids)).all() if all_emp_ids else []
    info_by_emp = {info.employee_id: info for info in emp_infos}

    trip_data = {}
    for t in trips:
        logs = [l for l in all_logs if l.trip_id == t.id]
        assigned_ids = set(l.employee_id for l in logs if l.action == 'assigned')
        boarded_ids = set(l.employee_id for l in logs if l.action == 'board')
        all_relevant_ids = set(l.employee_id for l in logs if l.action in ('assigned', 'board'))

        comparison = []
        for l in logs:
            if l.action not in ('assigned', 'board'): continue
            eid = l.employee_id
            # Avoid duplicates (prefer board over assigned)
            if any(e['id'] == eid for e in comparison): continue
            emp = l.employee
            if not emp: continue
            emp_code = emp.code or '-'
            is_temp = emp_code.startswith('TEMP-')
            info = info_by_emp.get(eid)
            cs = get_employee_cycle_status(info, t.date) if info else None
            is_boarded = eid in boarded_ids
            is_assigned = eid in assigned_ids

            route_mismatch = False
            original_route = ''
            if not is_temp and info and info.route and t.route and info.route_id != t.route_id:
                route_mismatch = True
                original_route = info.route.name

            if is_boarded:
                if is_temp:
                    status, color = 'مضاف', 'primary'
                elif route_mismatch:
                    status, color = f'مطابق (استثناء)', 'warning'
                else:
                    status, color = 'مطابق', 'success'
            elif is_assigned:
                status, color = 'لم يصعد', 'warning'
            else:
                status, color = '-', 'secondary'

            boarded_time = ''
            boarded_log = next((l for l in logs if l.employee_id == eid and l.action == 'board'), None)
            if boarded_log and boarded_log.time:
                boarded_time = boarded_log.time.strftime('%H:%M')

            comparison.append({
                'id': emp.id,
                'code': emp_code,
                'name': emp.name or '-',
                'job': emp.position if emp and emp.position else (info.department if info else '-'),
                'department': info.department if info else '-',
                'company': info.external_company if info and info.external_company else '-',
                'shift_type': info.shift_type.name if info and info.shift_type else '-',
                'work_day': (cs['position_in_cycle'] + 1) if cs else '-',
                'work_date': info.shift_start_date.strftime('%Y-%m-%d') if info and info.shift_start_date else '-',
                'today_status': cs['label'] if cs else '-',
                'status_color': cs['color'] if cs else 'secondary',
                'assigned': is_assigned,
                'boarded': is_boarded,
                'time': boarded_time,
                'status': status,
                'color': color,
                'route_mismatch': route_mismatch,
                'original_route': original_route,
            })

        total_assigned = len(assigned_ids)
        total_boarded = len(boarded_ids)
        missing = len([c for c in comparison if c['assigned'] and not c['boarded']])
        matched = len([c for c in comparison if c['status'] == 'مطابق' and c['boarded']])
        matched_exc = len([c for c in comparison if c['status'] == 'مطابق (استثناء)' and c['boarded']])
        violated = len([c for c in comparison if c['status'] == 'مخالف'])
        added = len([c for c in comparison if c['status'] == 'مضاف'])
        capacity = t.bus.capacity if t.bus else 0
        utilization = round((total_boarded / capacity * 100) if capacity > 0 else 0)
        trip_data[t.id] = {
            'trip': t,
            'comparison': comparison,
            'total_assigned': total_assigned,
            'total_boarded': total_boarded,
            'total_missing': missing,
            'matched': matched,
            'matched_exc': matched_exc,
            'violated': violated,
            'added': added,
            'capacity': capacity,
            'utilization': utilization,
        }

    routes = TransportRoute.query.filter_by(company_id=cid, status='active').all()
    drivers = Driver.query.filter_by(company_id=cid).all()
    shift_types = ShiftType.query.filter_by(company_id=cid).all()

    # Aggregate stats across all trips
    agg = {
        'trips': len(trips),
        'total_assigned': sum(td.get('total_assigned', 0) for td in trip_data.values()),
        'total_boarded': sum(td.get('total_boarded', 0) for td in trip_data.values()),
        'total_missing': sum(td.get('total_missing', 0) for td in trip_data.values()),
        'matched': sum(td.get('matched', 0) for td in trip_data.values()),
        'matched_exc': sum(td.get('matched_exc', 0) for td in trip_data.values()),
        'violated': sum(td.get('violated', 0) for td in trip_data.values()),
        'added': sum(td.get('added', 0) for td in trip_data.values()),
        'total_capacity': sum(td.get('capacity', 0) for td in trip_data.values()),
        'buses': {},
    }
    for t in trips:
        td = trip_data.get(t.id, {})
        if t.bus:
            bus_key = t.bus.plate_number or t.bus.name or f'باص {t.bus.id}'
            if bus_key not in agg['buses']:
                agg['buses'][bus_key] = {'capacity': 0, 'boarded': 0}
            agg['buses'][bus_key]['capacity'] = td.get('capacity', 0)
            agg['buses'][bus_key]['boarded'] += td.get('total_boarded', 0)
    for bus_key, bus_data in agg['buses'].items():
        bus_data['util'] = round((bus_data['boarded'] / bus_data['capacity'] * 100)) if bus_data['capacity'] > 0 else 0
    agg['overall_utilization'] = round((agg['total_boarded'] / agg['total_capacity'] * 100) if agg['total_capacity'] > 0 else 0)

    return render_template('employee_transport/trip_reports.html',
        trips=trips, trip_data=trip_data, routes=routes, drivers=drivers,
        shift_types=shift_types, agg=agg,
        from_date=from_date, to_date=to_date, route_id=route_id, driver_id=driver_id)

@et_bp.route('/promote-employee/<int:id>', methods=['POST'])
@login_required
def promote_employee(id):
    """Promote a TEMP employee to a regular employee with transport info."""
    try:
        emp = Employee.query.filter_by(id=id, company_id=current_user.company_id).first()
        if not emp:
            return jsonify({'success': False, 'message': 'الموظف غير موجود'})
        # Generate ET code
        existing = Employee.query.filter(Employee.company_id == current_user.company_id, Employee.code.like('ET-%')).all()
        max_num = 0
        for e in existing:
            if e.code and e.code.startswith('ET-'):
                try: max_num = max(max_num, int(e.code[3:]))
                except: pass
        emp.code = f'ET-{max_num + 1:03d}'
        emp.name = request.form.get('name', emp.name)
        emp.position = request.form.get('position', emp.position)
        emp.status = 'active'
        # Create/update transport info
        info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
        if info:
            info.department = request.form.get('department') or None
            info.external_company = request.form.get('external_company') or None
            info.shift_type_id = int(request.form.get('shift_type_id')) if request.form.get('shift_type_id') else None
            info.route_id = int(request.form.get('route_id')) if request.form.get('route_id') else None
            info.city = request.form.get('city') or None
            info.arrival_time = datetime.strptime(request.form.get('arrival_time'), '%H:%M').time() if request.form.get('arrival_time') else None
            info.departure_time = datetime.strptime(request.form.get('departure_time'), '%H:%M').time() if request.form.get('departure_time') else None
            info.transport_type = request.form.get('transport_type', 'ورديات')
        else:
            info = EmployeeTransportInfo(
                employee_id=emp.id, company_id=current_user.company_id,
                department=request.form.get('department') or None,
                external_company=request.form.get('external_company') or None,
                shift_type_id=int(request.form.get('shift_type_id')) if request.form.get('shift_type_id') else None,
                route_id=int(request.form.get('route_id')) if request.form.get('route_id') else None,
                city=request.form.get('city') or None,
                arrival_time=datetime.strptime(request.form.get('arrival_time'), '%H:%M').time() if request.form.get('arrival_time') else None,
                departure_time=datetime.strptime(request.form.get('departure_time'), '%H:%M').time() if request.form.get('departure_time') else None,
                transport_type=request.form.get('transport_type', 'ورديات'),
            )
            db.session.add(info)
        db.session.commit()
        return jsonify({'success': True, 'message': f'تم ترقية {emp.name} بنجاح', 'code': emp.code})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@et_bp.route('/update-employee-transport/<int:id>', methods=['POST'])
@login_required
def update_employee_transport(id):
    """Update employee transport info from trip reports."""
    try:
        emp = Employee.query.filter_by(id=id, company_id=current_user.company_id).first()
        if not emp:
            return jsonify({'success': False, 'message': 'الموظف غير موجود'})
        emp.name = request.form.get('name', emp.name)
        emp.position = request.form.get('position', emp.position)
        info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
        if not info:
            info = EmployeeTransportInfo(employee_id=emp.id, company_id=current_user.company_id)
            db.session.add(info)
        info.department = request.form.get('department') or None
        info.external_company = request.form.get('external_company') or None
        info.shift_type_id = int(request.form.get('shift_type_id')) if request.form.get('shift_type_id') else None
        info.route_id = int(request.form.get('route_id')) if request.form.get('route_id') else None
        info.city = request.form.get('city') or None
        info.arrival_time = datetime.strptime(request.form.get('arrival_time'), '%H:%M').time() if request.form.get('arrival_time') else None
        info.departure_time = datetime.strptime(request.form.get('departure_time'), '%H:%M').time() if request.form.get('departure_time') else None
        info.transport_type = request.form.get('transport_type', 'ورديات')
        # Also update shift start date & work day if needed
        if request.form.get('shift_start_date'):
            info.shift_start_date = datetime.strptime(request.form.get('shift_start_date'), '%Y-%m-%d').date()
        info.work_day = request.form.get('work_day') or None
        db.session.commit()
        return jsonify({'success': True, 'message': f'تم تحديث بيانات {emp.name} بنجاح'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@et_bp.route('/employee-data/<int:id>')
@login_required
def employee_data(id):
    """Return employee data with transport info as JSON."""
    emp = Employee.query.filter_by(id=id, company_id=current_user.company_id).first()
    if not emp:
        return jsonify({'success': False, 'message': 'الموظف غير موجود'})
    info = EmployeeTransportInfo.query.filter_by(employee_id=emp.id).first()
    return jsonify({
        'success': True,
        'employee': {
            'id': emp.id, 'code': emp.code, 'name': emp.name, 'position': emp.position,
            'status': emp.status,
        },
        'transport': {
            'department': info.department if info else '',
            'external_company': info.external_company if info else '',
            'shift_type_id': info.shift_type_id if info else '',
            'route_id': info.route_id if info else '',
            'city': info.city if info else '',
            'shift_start_date': info.shift_start_date.strftime('%Y-%m-%d') if info and info.shift_start_date else '',
            'work_day': info.work_day if info else '',
        } if info else None
    })
