const { Engine, Render, Runner, World, Bodies, Body, Composite, Events } = Matter;

// Configurações do Jogo
const gameConfig = {
    levels: [
        { people: 3, time: 75, title: "Nível 1: Resgate no Parque" },
        { people: 5, time: 65, title: "Nível 2: Emergência na Neve" },
        { people: 8, time: 60, title: "Nível 3: Pânico na Cidade" },
        { people: 10, time: 55, title: "Nível 4: Desafio Final" }
    ],
    car: {
        width: 60,
        height: 30,
        speed: 0.008,
        turnSpeed: 0.12 // Aumentado de 0.06 para 0.12 para girar mais rápido
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
    car = Bodies.rectangle(100, 100, 64, 32, {
        chamfer: { radius: 5 },
        frictionAir: 0.05,
        friction: 0.2,
        restitution: 0.1,
        render: {
            sprite: {
                texture: 'assets/car.svg',
                xScale: 0.5,
                yScale: 0.5
            }
        }
    });
    World.add(engine.world, car);

    // Zona de Resgate (Casa)
    checkoutHouse = Bodies.rectangle(window.innerWidth - 100, window.innerHeight - 100, 100, 100, {
        isStatic: true,
        isSensor: true, // Permite que o carro entre na zona
        label: 'house',
        render: {
            sprite: {
                texture: 'assets/house.svg',
                xScale: 1,
                yScale: 1
            }
        }
    });
    World.add(engine.world, checkoutHouse);

    // Pessoas e Obstáculos
    spawnLevelElements(level.people);

    Events.on(engine, 'collisionStart', handleCollisions);
}

function spawnLevelElements(numPeople) {
    // Obstáculos (Tijolos) - Barreira sólida com fundo transparente
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;

        const brick = Bodies.rectangle(x, y, 60, 30, {
            isStatic: true,
            label: 'obstacle',
            friction: 1,
            restitution: 0.1,
            render: {
                sprite: {
                    texture: 'assets/brick.svg',
                    xScale: 1,
                    yScale: 1
                }
            }
        });
        World.add(engine.world, brick);
    }

    // Pessoas - Fundo transparente
    people = [];
    for (let i = 0; i < numPeople; i++) {
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        const person = Bodies.circle(x, y, 20, {
            isSensor: true,
            label: 'person',
            render: {
                sprite: {
                    texture: 'assets/stickman.svg',
                    xScale: 1,
                    yScale: 1
                }
            }
        });
        people.push(person);
        World.add(engine.world, person);
    }
}

function handleKeyDown(e) {
    if (!gameActive) return;

    const angle = car.angle;
    const force = gameConfig.car.speed;
    const maxVelocity = 4;

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

    const velocity = car.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > maxVelocity) {
        const ratio = maxVelocity / speed;
        Body.setVelocity(car, { x: velocity.x * ratio, y: velocity.y * ratio });
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
    currentLevel = 0; // Reinicia para o Nível 1
    setupLevel(currentLevel);
    startGame();
});

// Iniciar ao carregar
window.onload = initGame;
