// Función para agregar un nuevo jugador
function agregarJugador() {
    const nombre = document.getElementById('nombre-jugador').value;
    const imagen = document.getElementById('imagen-jugador').value || 'https://i.imgur.com/placeholder.jpg';
    const rating = document.querySelectorAll('.stars .fas').length || 5;  // Contamos las estrellas seleccionadas

    if (!nombre) {
        alert('Por favor ingresa un nombre');
        return;
    }

    fetch('/agregar_jugador', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            nombre: nombre,
            imagen: imagen,
            rating: rating
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            cargarJugadores();
            document.getElementById('nombre-jugador').value = '';
            document.getElementById('imagen-jugador').value = '';
            resetStars();
            // Limpiar previsualización de imagen y el input de archivo
            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.innerHTML = '';
            }
            const fileUpload = document.getElementById('file-upload');
            if (fileUpload) {
                fileUpload.value = '';
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al agregar el jugador');
    });
}

// Función para cargar la lista de jugadores
function cargarJugadores() {
    fetch('/mis_jugadores')
        .then(response => response.json())
        .then(jugadores => {
            const container = document.getElementById('lista-jugadores');
            container.innerHTML = jugadores.map(jugador => `
                <div class="card jugador-card" data-id="${jugador.id}">
                    <img src="${jugador.imagen}" alt="${jugador.nombre}" style="width:100px;height:100px;object-fit:cover;">
                    <h3>${jugador.nombre}</h3>
                    <p class="rating-line">Rating:
                        <span class="jugador-rating-edit" data-rating="${jugador.rating}">
                            ${'★'.repeat(jugador.rating)}${'☆'.repeat(10-jugador.rating)}
                        </span>
                        <span class="rating-number">${jugador.rating}/10</span>
                    </p>
                    <button class="btn-editar" onclick="mostrarEditorRating(${jugador.id}, ${jugador.rating})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger" onclick="eliminarJugador(${jugador.id})">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                    <div class="editor-rating" id="editor-rating-${jugador.id}" style="display:none;">
                        <div class="stars-edit">
                            ${[...Array(10)].map((_,i) => `<i class='fa-star ${i < jugador.rating ? 'fas' : 'far'}' data-rating='${i+1}' onclick='editarRating(${jugador.id}, ${i+1})'></i>`).join('')}
                        </div>
                        <button onclick="ocultarEditorRating(${jugador.id})">Cancelar</button>
                    </div>
                </div>
            `).join('');
        });
}

// Función para manejar el rating con estrellas
document.querySelectorAll('.stars i').forEach(star => {
    star.addEventListener('click', function() {
        const rating = parseInt(this.dataset.rating);
        const stars = document.querySelectorAll('.stars i');
        const currentRating = document.querySelectorAll('.stars .fas').length;
        
        // Si se hace clic en la estrella actualmente seleccionada, deseleccionar todas
        if (currentRating === rating) {
            stars.forEach(s => {
                s.classList.remove('fas');
                s.classList.add('far');
            });
        } else {
            // Remover todas las clases fas (estrellas llenas)
            stars.forEach(s => {
                s.classList.remove('fas');
                s.classList.add('far');
            });
            // Añadir clase fas hasta la estrella clickeada
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= rating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                }
            });
        }
    });
});

// Función para resetear las estrellas
function resetStars() {
    document.querySelectorAll('.stars i').forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
}

// Función para eliminar un jugador
function eliminarJugador(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este jugador?')) {
        fetch(`/eliminar_jugador/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                cargarJugadores();
            } else {
                alert(data.message || 'Error al eliminar el jugador');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar el jugador');
        });
    }
}

// Función para generar equipos
function generarEquipos() {
    fetch('/generar_equipos', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'error') {
            alert(data.message);
            return;
        }

        const container = document.getElementById('equipos-generados');
        container.innerHTML = `
            <div class="equipo">
                <h3>Equipo 1</h3>
                <div class="rating-total">Rating Total: ${data.equipos.equipo1.rating_total}</div>
                ${data.equipos.equipo1.jugadores.map(jugador => `
                    <div class="jugador-equipo">
                        <img src="${jugador.imagen}" alt="${jugador.nombre}">
                        <div class="jugador-info">
                            <div>${jugador.nombre}</div>
                            <div class="jugador-rating">${'★'.repeat(jugador.rating)}${'☆'.repeat(10-jugador.rating)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="equipo">
                <h3>Equipo 2</h3>
                <div class="rating-total">Rating Total: ${data.equipos.equipo2.rating_total}</div>
                ${data.equipos.equipo2.jugadores.map(jugador => `
                    <div class="jugador-equipo">
                        <img src="${jugador.imagen}" alt="${jugador.nombre}">
                        <div class="jugador-info">
                            <div>${jugador.nombre}</div>
                            <div class="jugador-rating">${'★'.repeat(jugador.rating)}${'☆'.repeat(10-jugador.rating)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="balance-info">
                <p>Diferencia de rating entre equipos: <strong>${data.equipos.diferencia_rating}</strong></p>
                <p>${data.equipos.diferencia_rating <= 2 ? '✅ Equipos muy balanceados' : 
                    data.equipos.diferencia_rating <= 5 ? '⚠️ Equipos moderadamente balanceados' : 
                    '❌ Equipos desbalanceados'}</p>
            </div>
        `;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al generar los equipos');
    });
}

// Agregar funciones para edición de rating
function mostrarEditorRating(id, rating) {
    document.getElementById(`editor-rating-${id}`).style.display = 'block';
}

function ocultarEditorRating(id) {
    document.getElementById(`editor-rating-${id}`).style.display = 'none';
}

function editarRating(id, nuevoRating) {
    fetch(`/editar_jugador/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: nuevoRating })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            cargarJugadores();
        } else {
            alert(data.message || 'Error al editar el rating');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al editar el rating');
    });
}

// Cargar jugadores al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarJugadores();
    
    // Agregar evento para el botón de eliminar todos
    const eliminarTodosBtn = document.getElementById('eliminar-todos');
    eliminarTodosBtn.addEventListener('click', async function() {
        if (confirm('¿Estás seguro de que quieres eliminar todos los jugadores? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch('/eliminar_todos_jugadores', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    alert('Todos los jugadores han sido eliminados');
                    cargarJugadores(); // Recargar la lista (que estará vacía)
                } else {
                    const data = await response.json();
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                alert('Error al eliminar los jugadores: ' + error.message);
            }
        }
    });
    
    // Actualizar estado del botón eliminar todos
    function actualizarEstadoBotonEliminarTodos() {
        const jugadores = document.querySelectorAll('.jugador-card');
        eliminarTodosBtn.disabled = jugadores.length === 0;
    }
    
    // Llamar a actualizarEstadoBotonEliminarTodos después de cargar jugadores
    const cargarJugadoresOriginal = cargarJugadores;
    cargarJugadores = async function() {
        await cargarJugadoresOriginal();
        actualizarEstadoBotonEliminarTodos();
    };
    
    // Manejar la subida de archivos
    const fileUpload = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const imagenJugador = document.getElementById('imagen-jugador');
    
    fileUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Verificar que sea una imagen permitida
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'
            ];
            if (!allowedTypes.includes(file.type)) {
                alert('Por favor, sube solo imágenes en formato JPG, PNG, HEIC, HEIF o WEBP');
                return;
            }
            // Crear una URL temporal para la previsualización
            const reader = new FileReader();
            reader.onload = function(e) {
                // Mostrar previsualización
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Previsualización">`;
                imagePreview.style.display = 'block';
                // Guardar la URL temporal en el campo de imagen
                imagenJugador.value = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Limpiar previsualización cuando se borra la URL
    imagenJugador.addEventListener('input', function() {
        if (!this.value) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            fileUpload.value = ''; // Limpiar el input de archivo
        }
    });
    
    // Manejar el cambio de tema
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Función para aplicar el tema
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
    }
    
    // Verificar preferencia del sistema
    function checkSystemPreference() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        const savedTheme = localStorage.getItem('theme');
        
        // Si no hay tema guardado, usar la preferencia del sistema
        if (!savedTheme) {
            applyTheme(prefersDark.matches ? 'dark' : 'light');
        } else {
            applyTheme(savedTheme);
        }
        
        // Escuchar cambios en la preferencia del sistema
        prefersDark.addEventListener('change', (e) => {
            // Solo cambiar si no hay un tema guardado explícitamente
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Inicializar el tema
    checkSystemPreference();
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
});