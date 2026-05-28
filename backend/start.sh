python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed
python manage.py import_excel
exec gunicorn ghithops.wsgi --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile -
