// --- Background Particle System & Ambient Movement ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
const particleCount = 70;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.color = Math.random() > 0.5 ? '#00f2ff' : '#7000ff';
        this.opacity = Math.random() * 0.4 + 0.1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // Subtle connection lines for premium feel
    ctx.strokeStyle = '#303050';
    ctx.lineWidth = 0.2;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 180) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

animate();

// --- Intersection Observer for Scroll Animations ---
const observerOptions = {
    threshold: 0.15,
    rootMargin: "-50px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// --- Mouse-tracking Interactive Tilt (Parallax) ---
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.glass-card');
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;

    cards.forEach(card => {
        // Only tilt if it's currently on screen for performance
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            card.style.transform = `perspective(1000px) rotateX(${y * 6}deg) rotateY(${x * -6}deg) translateY(0)`;
        }
    });
});

// --- Simple Audio Context Setup for Atmosphere ---
// (Disabled by default, but could be added for elite UX)
console.log("THE MEMORY MECHANIC // 2142 // System Ready.");
