from datetime import date, timedelta


def get_employee_cycle_status(et_info, today=None):
    if not et_info or not et_info.shift_type or not et_info.shift_start_date:
        return None

    today = today or date.today()
    start = et_info.shift_start_date
    work_days = et_info.shift_type.work_days or 6
    vacation_days = et_info.shift_type.vacation_days or 1
    cycle_len = work_days + vacation_days

    if cycle_len == 0:
        return None

    diff = (today - start).days
    pos = diff % cycle_len

    if pos < work_days:
        if pos == 0:
            st, label, color = 'arriving', 'قادم', 'primary'
        elif pos == work_days - 1:
            st, label, color = 'departing', 'مغادر', 'warning'
        else:
            st, label, color = 'working', 'مداوم', 'success'
    else:
        vac_pos = pos - work_days
        if vac_pos == vacation_days - 1:
            st, label, color = 'transport_arrange', 'ترتيب مواصلات', 'secondary'
        else:
            st, label, color = 'vacation', 'إجازة', 'info'

    cycle_start = start + timedelta(days=(diff // cycle_len) * cycle_len)
    work_start = cycle_start
    work_end = cycle_start + timedelta(days=work_days - 1)
    vacation_start = cycle_start + timedelta(days=work_days)
    vacation_end = cycle_start + timedelta(days=cycle_len - 1)

    return {
        'status': st,
        'label': label,
        'color': color,
        'is_work_day': st in ('arriving', 'working', 'departing'),
        'position_in_cycle': pos,
        'cycle_len': cycle_len,
        'work_days': work_days,
        'vacation_days': vacation_days,
        'start_date': start,
        'cycle_start': cycle_start,
        'work_start': work_start,
        'work_end': work_end,
        'vacation_start': vacation_start,
        'vacation_end': vacation_end,
    }
