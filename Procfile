release: python manage.py migrate --noinput && python manage.py createcachetable
web: gunicorn backend.wsgi --bind 0.0.0.0:$PORT
