release: python manage.py migrate --noinput && python manage.py createcachetable && (python manage.py load_kicd --if-needed --no-new-subjects || true)
web: gunicorn backend.wsgi --bind 0.0.0.0:$PORT --timeout 300 --graceful-timeout 300
