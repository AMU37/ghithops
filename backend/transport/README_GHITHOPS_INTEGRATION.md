# GhithOps Transport Module Integration Guide

This module is the transport department package ready for integration into the GhithOps project.

## Where to place it
Place the `employee_transport/` folder inside the backend application root, at the same level as `core/`, `auth/`, `companies/`, and the other Flask modules.

Example:
```text
your_project/
  core/
  employee_transport/
  templates/
  static/
```

## How to register it
In your app bootstrap file:
```python
from employee_transport import et_bp
app.register_blueprint(et_bp)
```

## Requirements
- Existing `core.db` SQLAlchemy instance
- `Employee` and `User` models in `core.models`
- `company_id`-based tenant scoping
- `login_required` and current user support from Flask-Login

## Notes
- The module is already structured for:
  - Companies
  - Routes
  - Buses
  - Drivers
  - Assignments
  - Trips
  - Ride logs
  - Violations
  - Reports
- It compiles successfully as Python source.
