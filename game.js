const canvas = document.getElementById('gameCanvas');
canvas.width = 1200;
canvas.height = 600;
const ctx = canvas.getContext('2d');

// Load images
const astronautImg = new Image();
astronautImg.src = 'https://img.icons8.com/color/48/000000/astronaut.png';

const asteroidImg = new Image();
asteroidImg.src = 'https://img.icons8.com/emoji/48/000000/rock-emoji.png';

const heartImg = new Image();
heartImg.src = 'https://img.icons8.com/emoji/48/000000/red-heart.png';

const fireImg = new Image();
fireImg.src = 'https://img.icons8.com/emoji/48/000000/fire.png'; // Изображение огня

const speedPowerUpImg = new Image();
speedPowerUpImg.src = 'https://img.icons8.com/color/48/000000/lightning-bolt.png'; // Ускорение

const shieldPowerUpImg = new Image();
shieldPowerUpImg.src = 'https://img.icons8.com/color/48/000000/shield.png'; // Щит (неуязвимость)

let stars = [];

for (let i = 0; i < 150; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2,
        speed: Math.random() * 1 + 0.5
    });
}

function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

let astronaut = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    dx: 0,
    dy: 0,
    maxSpeed: 7,
    acceleration: 0.2, // Ускорение
    friction: 0.98, // Трение для инерции
    lives: 3,
    isShielded: false, // Флаг для неуязвимости
    shieldTimer: 0 // Таймер для неуязвимости
};

let asteroids = [];
let bullets = [];
let powerUps = []; // Массив для power-ups
let score = 0;
let gameOver = false;
let lastShootTime = 0;
let reloadTime = 3000;
let reloadTimer = 0;

// Переменные для таймера активных power-ups
let activePowerUp = null; // Текущий активный power-up
let powerUpDuration = 5000; // Длительность действия power-up (5 секунд)
let powerUpStartTime = 0; // Время начала действия power-up

// Функция для создания астероидов
function createAsteroid() {
    const size = Math.random() * 50 + 30;
    const x = Math.random() * (canvas.width - size);
    const speed = Math.random() * 3 + 1;
    asteroids.push({ x, y: -size, size, speed });
}

// Отрисовка астероидов
function drawAsteroid() {
    asteroids.forEach(asteroid => {
        ctx.drawImage(asteroidImg, asteroid.x, asteroid.y, asteroid.size, asteroid.size);
    });
}

function updateAsteroids() {
    asteroids.forEach(asteroid => {
        asteroid.y += asteroid.speed;
    });
    asteroids = asteroids.filter(asteroid => asteroid.y < canvas.height);
}

// Создание power-up с таймером на исчезновение и случайной анимацией
function createPowerUp() {
    const x = Math.random() * (canvas.width - 50);
    const y = Math.random() * (canvas.height - 50);
    const type = Math.random() < 0.5 ? 'speed' : 'shield'; // Случайный выбор между ускорением и щитом
    const timeToLive = 7000; // Power-up исчезает через 7 секунд
    const createdTime = Date.now();
    powerUps.push({ x, y, type, timeToLive, createdTime });
}

// Отрисовка power-ups с анимацией мигания перед исчезновением
function drawPowerUps() {
    powerUps.forEach(powerUp => {
        const elapsedTime = Date.now() - powerUp.createdTime;
        if (elapsedTime >= powerUp.timeToLive - 2000) { // Power-up мигает за 2 секунды до исчезновения
            if (Math.floor(elapsedTime / 200) % 2 === 0) {
                return; // Мигаем каждые 200 мс
            }
        }

        if (powerUp.type === 'speed') {
            ctx.drawImage(speedPowerUpImg, powerUp.x, powerUp.y, 30, 30);
        } else if (powerUp.type === 'shield') {
            ctx.drawImage(shieldPowerUpImg, powerUp.x, powerUp.y, 30, 30);
        }
    });
}

function updatePowerUps() {
    // Удаляем power-ups, которые "жили" больше 7 секунд
    powerUps = powerUps.filter(powerUp => Date.now() - powerUp.createdTime < powerUp.timeToLive);
}

function checkPowerUpCollision() {
    powerUps.forEach((powerUp, index) => {
        if (
            astronaut.x < powerUp.x + 30 &&
            astronaut.x + astronaut.width > powerUp.x &&
            astronaut.y < powerUp.y + 30 &&
            astronaut.y + astronaut.height > powerUp.y
        ) {
            // Активируем power-up
            activePowerUp = powerUp.type;
            powerUpStartTime = Date.now();

            if (powerUp.type === 'speed') {
                astronaut.maxSpeed *= 1.5; // Увеличиваем скорость
                setTimeout(() => {
                    astronaut.maxSpeed /= 1.5; // Возвращаем скорость обратно через 5 секунд
                    activePowerUp = null; // Очищаем активный power-up после его действия
                }, powerUpDuration);
            } else if (powerUp.type === 'shield') {
                astronaut.isShielded = true; // Включаем неуязвимость
                astronaut.shieldTimer = Date.now();
                setTimeout(() => {
                    astronaut.isShielded = false; // Отключаем щит через 5 секунд
                    activePowerUp = null; // Очищаем активный power-up после его действия
                }, powerUpDuration);
            }
            powerUps.splice(index, 1); // Убираем power-up с поля
        }
    });
}

function checkShieldTimer() {
    if (astronaut.isShielded && Date.now() - astronaut.shieldTimer > 5000) { // 5 секунд щита
        astronaut.isShielded = false; // Отключаем щит
    }
}

// Стрельба
function shootBullet() {
    const currentTime = Date.now();
    if (currentTime - lastShootTime >= reloadTime) {
        bullets.push({
            x: astronaut.x + astronaut.width / 2 - 2.5,
            y: astronaut.y,
            width: 5,
            height: 10,
            speed: 7
        });
        lastShootTime = currentTime;
    }
}

function drawBullets() {
    ctx.fillStyle = 'yellow';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function updateBullets() {
    bullets.forEach(bullet => {
        bullet.y -= bullet.speed;
    });
    bullets = bullets.filter(bullet => bullet.y > 0);
}

// Обработка столкновения пуль с астероидами
function detectBulletCollision() {
    bullets.forEach((bullet, bulletIndex) => {
        asteroids.forEach((asteroid, asteroidIndex) => {
            if (
                bullet.x < asteroid.x + asteroid.size &&
                bullet.x + bullet.width > asteroid.x &&
                bullet.y < asteroid.y + asteroid.size &&
                bullet.height + bullet.y > asteroid.y
            ) {
                asteroids.splice(asteroidIndex, 1);
                bullets.splice(bulletIndex, 1);
                score += 100;
            }
        });
    });
}

// Обработка столкновений астронавта с астероидами
function detectCollision() {
    asteroids.forEach((asteroid, asteroidIndex) => {
        const dx = astronaut.x + astronaut.width / 2 - (asteroid.x + asteroid.size / 2);
        const dy = astronaut.y + astronaut.height / 2 - (asteroid.y + asteroid.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < astronaut.width / 2 + asteroid.size / 2) {
            if (!astronaut.isShielded) { // Если щит выключен, убираем жизнь
                asteroids.splice(asteroidIndex, 1);
                astronaut.lives--;
                if (astronaut.lives === 0) {
                    gameOver = true;
                }
            }
        }
    });
}

// Отрисовка количества жизней
function drawLives() {
    for (let i = 0; i < astronaut.lives; i++) {
        ctx.drawImage(heartImg, 20 + i * 40, 20, 30, 30);
    }
}

// Отрисовка огня при движении астронавта
function drawFire() {
    ctx.drawImage(fireImg, astronaut.x + astronaut.width / 2 - 10, astronaut.y + astronaut.height, 20, 30);
}

// Отрисовка астронавта
function drawAstronaut() {
    ctx.drawImage(astronautImg, astronaut.x, astronaut.y, astronaut.width, astronaut.height);
}

// Обновление движения астронавта
function updateAstronaut() {
    astronaut.dx *= astronaut.friction; // Применение трения для инерции
    astronaut.dy *= astronaut.friction;

    astronaut.x += astronaut.dx;
    astronaut.y += astronaut.dy;

    if (astronaut.x < 0) astronaut.x = 0;
    if (astronaut.x + astronaut.width > canvas.width) astronaut.x = canvas.width - astronaut.width;
    if (astronaut.y < 0) astronaut.y = 0;
    if (astronaut.y + astronaut.height > canvas.height) astronaut.y = canvas.height - astronaut.height;
}
 document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault(); // Отключаем прокрутку при нажатии пробела
        spacePressed = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (e.code === 'Space') {
        spacePressed = false;
    }
});

// Функция для отрисовки таймера действия power-up
function drawPowerUpTimer() {
    if (activePowerUp) {
        let remainingTime = ((powerUpDuration - (Date.now() - powerUpStartTime)) / 1000).toFixed(1);
        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.fillText(`Power-up (${activePowerUp}) time left: ${remainingTime}s`, 10, 80);
    }
}

let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') leftPressed = true;
    if (e.key === 'ArrowRight') rightPressed = true;
    if (e.key === 'ArrowUp') upPressed = true;
    if (e.key === 'ArrowDown') downPressed = true;
    if (e.key === ' ') spacePressed = true;
});

document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft') leftPressed = false;
    if (e.key === 'ArrowRight') rightPressed = false;
    if (e.key === 'ArrowUp') upPressed = false;
    if (e.key === 'ArrowDown') downPressed = false;
    if (e.key === ' ') spacePressed = false;
});

function update() {
    if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '48px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 130, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 70, canvas.height / 2 + 50);
        ctx.fillText('Press R to restart', canvas.width / 2 - 90, canvas.height / 2 + 100);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    updateStars();

    if (Math.random() < 0.08) { // Понижаем шанс появления power-up до 3%
        createAsteroid();
    }

    if (Math.random() < 0.002) { // Понижаем шанс появления power-up до 0.2%
        createPowerUp();
    }

    if (leftPressed) {
        astronaut.dx -= astronaut.acceleration;
    }
    if (rightPressed) {
        astronaut.dx += astronaut.acceleration;
    }
    if (upPressed) {
        astronaut.dy -= astronaut.acceleration;
    }
    if (downPressed) {
        astronaut.dy += astronaut.acceleration;
    }

    if (leftPressed || rightPressed || upPressed || downPressed) {
        drawFire(); // Показываем огонь, когда астронавт движется
    }

    updateAstronaut();
    updateAsteroids();
    updatePowerUps();
    detectCollision();

    drawAstronaut();
    drawAsteroid();
    drawPowerUps(); // Отрисовка power-ups
    checkPowerUpCollision(); // Проверка на столкновение с power-ups
    checkShieldTimer(); // Проверка на окончание действия щита

    if (spacePressed) {
        shootBullet();
    }

    updateBullets();
    drawBullets();
    detectBulletCollision();

    drawLives();

    let timeSinceLastShot = Date.now() - lastShootTime;
    reloadTimer = (reloadTime - timeSinceLastShot) / 1000;
    if (reloadTimer > 0) {
        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.fillText(`Weapon reload: ${reloadTimer.toFixed(1)}s`, 10, 60);
    }

    // Отрисовка таймера действия активного power-up
    drawPowerUpTimer();

    score++;
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);

    requestAnimationFrame(update);
}

function resetGame() {
    score = 0;
    asteroids = [];
    bullets = [];
    powerUps = []; // Очищаем power-ups
    astronaut.x = canvas.width / 2 - astronaut.width / 2;
    lastShootTime = 0;
    astronaut.lives = 3;
    astronaut.isShielded = false; // Сбрасываем щит
    activePowerUp = null; // Сбрасываем активный power-up
    gameOver = false;
    update();
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'r' || e.key === 'R') {
        if (gameOver) {
            resetGame();
        }
    }
});

update();

window.addEventListener("keydown", function(e) {
    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) > -1) {
        e.preventDefault();
    }
}, false);
