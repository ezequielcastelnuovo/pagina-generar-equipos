from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from flask_migrate import Migrate
import os
import random


app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24).hex())
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db').replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Modelos
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    jugadores = db.relationship('Jugador', backref='user', lazy=True)
    partidos = db.relationship('Partido', backref='user', lazy=True)

class Jugador(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), nullable=False)
    imagen = db.Column(db.String(200), default='https://i.imgur.com/placeholder.jpg')
    rating = db.Column(db.Integer, default=5)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Partido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    equipos = db.Column(db.JSON)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Autenticación
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Rutas de autenticación
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = generate_password_hash(request.form.get('password'))
        user = User(username=username, password=password)
        db.session.add(user)
        db.session.commit()
        flash('¡Registro exitoso!', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form.get('username')).first()
        if user and check_password_hash(user.password, request.form.get('password')):
            login_user(user)
            return redirect(url_for('gestion_jugadores'))
        flash('Usuario o contraseña incorrectos', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Rutas de jugadores
@app.route('/jugadores')
@login_required
def gestion_jugadores():
    return render_template('jugadores.html', username=current_user.username)

@app.route('/agregar_jugador', methods=['POST'])
@login_required
def agregar_jugador():
    data = request.json
    jugador = Jugador(
        nombre=data['nombre'],
        imagen=data.get('imagen', 'https://i.imgur.com/placeholder.jpg'),
        rating=int(data['rating']),
        user_id=current_user.id
    )
    db.session.add(jugador)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/mis_jugadores')
@login_required
def mis_jugadores():
    jugadores = Jugador.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        "id": j.id,
        "nombre": j.nombre,
        "imagen": j.imagen,
        "rating": j.rating
    } for j in jugadores])

@app.route('/eliminar_jugador/<int:jugador_id>', methods=['DELETE'])
@login_required
def eliminar_jugador(jugador_id):
    jugador = Jugador.query.get_or_404(jugador_id)
    if jugador.user_id != current_user.id:
        return jsonify({"status": "error", "message": "No tienes permiso para eliminar este jugador"}), 403
    db.session.delete(jugador)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/eliminar_todos_jugadores', methods=['DELETE'])
@login_required
def eliminar_todos_jugadores():
    try:
        Jugador.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/generar_equipos', methods=['POST'])
@login_required
def generar_equipos():
    jugadores = Jugador.query.filter_by(user_id=current_user.id).all()
    
    if len(jugadores) < 4:  # Mínimo 2 jugadores por equipo
        return jsonify({"status": "error", "message": "Se necesitan al menos 4 jugadores para generar equipos"})
    
    # Mezclar los jugadores aleatoriamente antes de ordenarlos
    random.shuffle(jugadores)
    
    # Ordenar jugadores por rating
    jugadores_ordenados = sorted(jugadores, key=lambda x: x.rating, reverse=True)
    
    def calcular_diferencia(equipo1, equipo2):
        rating1 = sum(j.rating for j in equipo1)
        rating2 = sum(j.rating for j in equipo2)
        return abs(rating1 - rating2)
    
    def generar_combinaciones(jugadores, equipo_actual, indice, mejor_combinacion, mejor_diferencia, intentos=0):
        if intentos > 100:  # Límite de intentos para evitar bucles infinitos
            return mejor_combinacion[0], mejor_combinacion[1], mejor_diferencia
            
        if indice == len(jugadores):
            equipo1 = equipo_actual
            equipo2 = [j for j in jugadores if j not in equipo_actual]
            
            # Asegurarse de que los equipos tengan al menos 2 jugadores
            if len(equipo1) < 2 or len(equipo2) < 2:
                return mejor_combinacion[0], mejor_combinacion[1], mejor_diferencia
                
            diferencia = calcular_diferencia(equipo1, equipo2)
            
            # Aceptar la combinación si la diferencia es menor o igual a 5
            if diferencia <= 5:
                return equipo1, equipo2, diferencia
            return mejor_combinacion[0], mejor_combinacion[1], mejor_diferencia
        
        # Decidir aleatoriamente si añadir el jugador al equipo 1
        if random.random() < 0.5:
            equipo1, equipo2, diferencia = generar_combinaciones(
                jugadores, equipo_actual + [jugadores[indice]], indice + 1, mejor_combinacion, mejor_diferencia, intentos + 1
            )
        else:
            equipo1, equipo2, diferencia = generar_combinaciones(
                jugadores, equipo_actual, indice + 1, mejor_combinacion, mejor_diferencia, intentos + 1
            )
        
        return equipo1, equipo2, diferencia
    
    # Generar combinaciones hasta encontrar un buen balance
    mejor_diferencia = float('inf')
    mejor_combinacion = None
    
    for _ in range(10):  # Intentar 10 veces diferentes combinaciones
        equipo1, equipo2, diferencia = generar_combinaciones(jugadores_ordenados, [], 0, mejor_combinacion, mejor_diferencia)
        if diferencia < mejor_diferencia:
            mejor_diferencia = diferencia
            mejor_combinacion = (equipo1, equipo2)
    
    # Si no se encontró una combinación válida, usar la distribución alternada
    if mejor_combinacion is None:
        equipo1 = []
        equipo2 = []
        for i, jugador in enumerate(jugadores_ordenados):
            if i % 2 == 0:
                equipo1.append(jugador)
            else:
                equipo2.append(jugador)
    else:
        equipo1, equipo2 = mejor_combinacion
    
    # Convertir los equipos al formato necesario
    equipo1_formato = [{
        "id": j.id,
        "nombre": j.nombre,
        "rating": j.rating,
        "imagen": j.imagen
    } for j in equipo1]
    
    equipo2_formato = [{
        "id": j.id,
        "nombre": j.nombre,
        "rating": j.rating,
        "imagen": j.imagen
    } for j in equipo2]
    
    # Calcular ratings totales
    rating_equipo1 = sum(j.rating for j in equipo1)
    rating_equipo2 = sum(j.rating for j in equipo2)
    
    # Crear un nuevo partido
    partido = Partido(
        equipos={"equipo1": equipo1_formato, "equipo2": equipo2_formato},
        user_id=current_user.id
    )
    db.session.add(partido)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "equipos": {
            "equipo1": {"jugadores": equipo1_formato, "rating_total": rating_equipo1},
            "equipo2": {"jugadores": equipo2_formato, "rating_total": rating_equipo2},
            "diferencia_rating": abs(rating_equipo1 - rating_equipo2)
        }
    })

# Inicialización
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)