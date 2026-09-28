from .database import initialize
from .routes import employee_api

def install(app):
    initialize()
    app.register_blueprint(employee_api)
