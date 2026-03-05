const { Engine, Render, Runner, World, Bodies, Body, Composite, Events } = Matter;

// Configurações do Jogo
const gameConfig = {
    levels: [
        { people: 3, time: 60, title: "Nível 1: Resgate no Parque" },
        { people: 5, time: 50, title: "Nível 2: Emergência na Neve" },
        { people: 8, time: 45, title: "Nível 3: Pânico na Cidade" },
        { people: 10, time: 40, title: "Nível 4: Desafio Final" }
    ],
    car: {
        width: 60,
        height: 30,
        speed: 0.005,
        turnSpeed: 0.05
    }
};

let currentLevel = 0;
let rescuedCount = 0;
let timer = 0;
let gameActive = false;
let gameInterval;
let engine, render, runner, car;
let people = [];
let checkoutHouse;

// Elementos do DOM
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const retryBtn = document.getElementById('retry-btn');
const overlay = document.getElementById('overlay');
const menuContent = document.getElementById('menu-content');
const winContent = document.getElementById('win-content');
const gameoverContent = document.getElementById('gameover-content');
const levelSpan = document.querySelector('#level-display span');
const timerSpan = document.querySelector('#timer-display span');
const rescueSpan = document.querySelector('#rescue-display span');

// Inicialização
function initGame() {
    engine = Engine.create();
    engine.gravity.y = 0; // Top-down

    const canvas = document.getElementById('game-canvas');
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: '#2f3542'
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    setupLevel(0);
    window.addEventListener('keydown', handleKeyDown);
}

function setupLevel(levelIdx) {
    World.clear(engine.world);

    const level = gameConfig.levels[levelIdx];
    rescuedCount = 0;
    timer = level.time;
    updateHUD();

    // Bordas
    const wallOptions = { isStatic: true, render: { fillStyle: '#2f3542' } };
    World.add(engine.world, [
        Bodies.rectangle(window.innerWidth / 2, -10, window.innerWidth, 20, wallOptions),
        Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 10, window.innerWidth, 20, wallOptions),
        Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, wallOptions),
        Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, wallOptions)
    ]);

    // Carro
    car = Bodies.rectangle(100, 100, gameConfig.car.width, gameConfig.car.height, {
        chamfer: { radius: 5 },
        render: { fillStyle: '#ff4757' }
    });
    World.add(engine.world, car);

    // Casa de Checkout (Visualmente melhorada)
    checkoutHouse = Bodies.circle(window.innerWidth - 100, window.innerHeight - 100, 60, {
        isStatic: true,
        label: 'house',
        render: {
            fillStyle: '#ffa502',
            strokeStyle: '#ffffff',
            lineWidth: 5
        }
    });
    World.add(engine.world, checkoutHouse);

    // Pessoas e Obstáculos
    spawnLevelElements(level.people);

    Events.on(engine, 'collisionStart', handleCollisions);
}

function spawnLevelElements(numPeople) {
    // Obstáculos (Árvores/Pedras)
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        const obstacle = Bodies.circle(x, y, 20 + Math.random() * 20, {
            isStatic: true,
            render: { fillStyle: Math.random() > 0.5 ? '#2ed573' : '#747d8c' }
        });
        World.add(engine.world, obstacle);
    }

    // Pessoas
    people = [];
    for (let i = 0; i < numPeople; i++) {
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        const person = Bodies.circle(x, y, 10, {
            isSensor: true,
            label: 'person',
            render: { fillStyle: '#ffffff' }
        });
        people.push(person);
        World.add(engine.world, person);
    }
}

function handleKeyDown(e) {
    if (!gameActive) return;

    const angle = car.angle;
    const force = gameConfig.car.speed;

    if (e.key === 'ArrowUp') {
        Body.applyForce(car, car.position, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        });
    }
    if (e.key === 'ArrowDown') {
        Body.applyForce(car, car.position, {
            x: -Math.cos(angle) * (force * 0.5),
            y: -Math.sin(angle) * (force * 0.5)
        });
    }
    if (e.key === 'ArrowLeft') {
        Body.rotate(car, -gameConfig.car.turnSpeed);
    }
    if (e.key === 'ArrowRight') {
        Body.rotate(car, gameConfig.car.turnSpeed);
    }
}

function handleCollisions(event) {
    event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        if ((bodyA === car && bodyB.label === 'person') || (bodyB === car && bodyA.label === 'person')) {
            const personBody = bodyA.label === 'person' ? bodyA : bodyB;
            if (personBody.render.visible !== false) {
                personBody.render.visible = false;
                World.remove(engine.world, personBody);
                rescuedCount++;
                updateHUD();
            }
        }

        if ((bodyA === car && bodyB === checkoutHouse) || (bodyB === car && bodyA === checkoutHouse)) {
            if (rescuedCount >= gameConfig.levels[currentLevel].people) {
                winLevel();
            }
        }
    });
}

function winLevel() {
    stopGame();
    overlay.classList.remove('hidden');
    winContent.classList.remove('hidden');
}

function gameOver() {
    stopGame();
    overlay.classList.remove('hidden');
    gameoverContent.classList.remove('hidden');
}

function updateHUD() {
    levelSpan.innerText = currentLevel + 1;
    timerSpan.innerText = `${timer}s`;
    rescueSpan.innerText = `${rescuedCount}/${gameConfig.levels[currentLevel].people}`;
}

function startGame() {
    gameActive = true;
    overlay.classList.add('hidden');
    menuContent.classList.add('hidden');
    winContent.classList.add('hidden');
    gameoverContent.classList.add('hidden');

    gameInterval = setInterval(() => {
        timer--;
        updateHUD();
        if (timer <= 0) gameOver();
    }, 1000);
}

function stopGame() {
    gameActive = false;
    clearInterval(gameInterval);
}

// Event Listeners dos Botões
startBtn.addEventListener('click', () => {
    startGame();
});

nextBtn.addEventListener('click', () => {
    currentLevel = (currentLevel + 1) % gameConfig.levels.length;
    setupLevel(currentLevel);
    startGame();
});

retryBtn.addEventListener('click', () => {
    setupLevel(currentLevel);
    startGame();
});

// Iniciar ao carregar
window.onload = initGame;
