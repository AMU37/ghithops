python manage.py migrate --noinput
python manage.py seed --noinput
exec gunicorn ghithops.wsgi --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile -
