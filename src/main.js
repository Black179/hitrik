import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ---- SCENE SETUP ----
const canvas = document.getElementById('background-canvas');

const isMobile = window.innerWidth <= 768;
const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000103, 0.004); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10); // Start very close to the chip for splash animation
camera.lookAt(0, 0, 0);

// ---- POST PROCESSING ----
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 2.0;
bloomPass.radius = 0.6;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ---- COLORS ----
const colors = {
    baseMetal: 0x020614,
    glassDie: 0x01132b,
    glowCyan: 0x00f3ff,
    circuitLine: 0x0066cc, 
    node: 0x0088ff,
    electron: 0x00f3ff,
    accent: 0x7700ff,
    gridMain: 0x005599,
    gridSub: 0x001133
};

const board = new THREE.Group();
scene.add(board);

// ---- BACKGROUND GRID ----
const gridHelper = new THREE.GridHelper(400, 100, colors.gridMain, colors.gridSub);
gridHelper.rotation.x = Math.PI / 2;
gridHelper.position.z = -2;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.15;
board.add(gridHelper);

// ---- 1. RANDOMIZED MATRIX CHIP ----
const chipGroup = new THREE.Group();
chipGroup.position.set(0, 0, 0); 
board.add(chipGroup);

function createRandomChipTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 512, 512);
    ctx.shadowColor = 'rgba(0, 243, 255, 0.3)';
    ctx.shadowBlur = 4; // very light glow
    ctx.strokeStyle = '#007c82'; // medium-dark cyan
    ctx.fillStyle = '#007c82'; // medium-dark cyan
    
    const p = 16;
    ctx.lineWidth = 10;
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(p, p, 512 - p*2, 512 - p*2, 16); ctx.stroke();
    } else {
        ctx.strokeRect(p, p, 512 - p*2, 512 - p*2);
    }
    
    // Abstract randomized symmetry
    ctx.lineWidth = 4;
    
    // Use seeded randomness roughly so it looks structured
    const routes = [];
    for(let i=0; i<12; i++) {
        routes.push({
            sx: Math.random() * 150 + 60,
            sy: Math.random() * 150 + 60,
            dx: Math.random() * 80 - 40,
            dy: Math.random() * 80 - 40,
            diag: Math.random() * 40,
            nodeRadius: 3 + Math.random() * 4
        });
    }

    const drawQuadrant = (scaleX, scaleY) => {
        ctx.save();
        ctx.translate(256, 256);
        ctx.scale(scaleX, scaleY);
        
        routes.forEach(r => {
            ctx.beginPath();
            let cx = r.sx; let cy = r.sy;
            ctx.moveTo(cx, cy);
            
            if(r.dx > r.dy) cx += r.dx;
            else cy += r.dy;
            ctx.lineTo(cx, cy);
            
            cx += r.diag; cy += r.diag;
            ctx.lineTo(cx, cy);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(cx, cy, r.nodeRadius, 0, Math.PI*2);
            ctx.fill();
        });
        
        ctx.restore();
    };
    
    drawQuadrant(1, 1);
    drawQuadrant(-1, 1);
    drawQuadrant(1, -1);
    drawQuadrant(-1, -1);

    // Central solid block
    ctx.shadowBlur = 20;
    ctx.fillRect(256 - 65, 256 - 65, 130, 130);
    
    // VLSI text
    ctx.fillStyle = '#010206';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 45px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VLSI', 256, 258);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function createAuraTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 243, 255, 0.4)');
    gradient.addColorStop(0.3, 'rgba(0, 100, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

// 1A. Soft subtle aura
const auraGeo = new THREE.PlaneGeometry(35, 35);
const auraMat = new THREE.MeshBasicMaterial({
    map: createAuraTexture(),
    transparent: true,
    opacity: 0.0, // removed aura completely
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const auraMesh = new THREE.Mesh(auraGeo, auraMat);
auraMesh.position.z = -1;
chipGroup.add(auraMesh);

// 1B. Sleek Black Base (16x16)
const baseGeo = new THREE.BoxGeometry(16, 16, 1.5); 
const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x010206, 
    metalness: 0.9,  
    roughness: 0.3, 
});
const baseMesh = new THREE.Mesh(baseGeo, baseMat);
chipGroup.add(baseMesh);

// 1C. Randomized Texture Plane
const logoGeo = new THREE.PlaneGeometry(16, 16);
const logoMat = new THREE.MeshBasicMaterial({ 
    map: createRandomChipTexture(), 
    transparent: true, 
    opacity: 1.0,
    blending: THREE.NormalBlending // changed from AdditiveBlending to remove intrinsic glow mixing
});
const logoMesh = new THREE.Mesh(logoGeo, logoMat);
logoMesh.position.z = 0.8; 
chipGroup.add(logoMesh);


// ---- 2. DENSE PCB PATHWAYS ----
function generateBasePaths() {
    const qPaths = [];
    const numTop = isMobile ? 6 : 14;
    const numRight = isMobile ? 4 : 10;
    
    // Top Edge paths (Square Base Plate is 16x16, top edge y=8)
    for(let i=0; i<numTop; i++) {
        let px = 1 + (i / numTop) * 6; 
        let py = 8.5; // Start precisely off the chip
        const pts = [new THREE.Vector3(px, py, 0)];
        
        let currentDir = 'up'; 
        for(let s=0; s<4; s++) {
            let len = Math.random() * 8 + 6; 
            if(currentDir === 'up') {
                py += len;
                currentDir = (i % 2 === 0) ? 'diag-right' : 'right';
            } else if(currentDir === 'right') {
                px += len;
                currentDir = 'up';
            } else if(currentDir === 'diag-right') {
                px += len;
                py += len;
                currentDir = Math.random() > 0.5 ? 'up' : 'right';
            }
            pts.push(new THREE.Vector3(px, py, 0));
        }
        pts.push(new THREE.Vector3(px + (currentDir==='right'?60:0), py + (currentDir==='up'?60:60), 0)); 
        qPaths.push(pts);
    }
    
    // Right Edge paths (right edge is x=8)
    for(let i=0; i<numRight; i++) {
        let px = 8.5;
        let py = 1 + (i / numRight) * 6;
        const pts = [new THREE.Vector3(px, py, 0)];
        
        let currentDir = 'right'; 
        for(let s=0; s<4; s++) {
            let len = Math.random() * 8 + 6;
            if(currentDir === 'right') {
                px += len;
                currentDir = (i % 2 === 0) ? 'diag-up' : 'up';
            } else if(currentDir === 'up') {
                py += len;
                currentDir = 'right';
            } else if(currentDir === 'diag-up') {
                px += len;
                py += len;
                currentDir = Math.random() > 0.5 ? 'right' : 'up';
            }
            pts.push(new THREE.Vector3(px, py, 0));
        }
        pts.push(new THREE.Vector3(px + 60, py + 60, 0));
        qPaths.push(pts);
    }
    return qPaths;
}

const basePaths = generateBasePaths();
const paths = [];
const electrons = [];

const mirrors = [
    [1, 1],   // Q1
    [-1, 1],  // Q2
    [-1, -1], // Q3
    [1, -1]   // Q4
];

mirrors.forEach(([mx, my]) => {
    basePaths.forEach(pts => {
        const mirroredPts = pts.map(p => new THREE.Vector3(p.x * mx, p.y * my, 0));
        const curve = new THREE.CatmullRomCurve3(mirroredPts, false, 'catmullrom', 0);
        paths.push(curve);
        
        const geo = new THREE.BufferGeometry().setFromPoints(mirroredPts);
        const mat = new THREE.LineBasicMaterial({ color: colors.circuitLine, transparent: true, opacity: 0.4 });
        const line = new THREE.Line(geo, mat);
        board.add(line);
        
        // Nodes
        for(let j=1; j<mirroredPts.length-1; j++) {
            if(Math.random() > 0.4) {
                const nodeGeo = new THREE.CircleGeometry(0.3, 16);
                const nodeMat = new THREE.MeshBasicMaterial({ color: colors.node, transparent: true, opacity: 0.8 });
                const node = new THREE.Mesh(nodeGeo, nodeMat);
                node.position.copy(mirroredPts[j]);
                board.add(node);
            }
        }
        
        // Dynamic electrons
        if(Math.random() > 0.2) {
            const numElectrons = isMobile ? 1 : (Math.random() > 0.8 ? 2 : 1);
            for(let e=0; e<numElectrons; e++) {
                const eGeo = new THREE.CircleGeometry(0.5, 16); 
                const eMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.7 ? colors.accent : colors.electron });
                const mesh = new THREE.Mesh(eGeo, eMat);
                mesh.position.z = 0.1; 
                board.add(mesh);
                electrons.push({
                    mesh, 
                    path: curve, 
                    progress: Math.random(), 
                    baseSpeed: Math.random() * 0.002 + 0.001 // Tripled the electron base speed for faster energy flow
                });
            }
        }
    });
});

// ---- 3. PARTICLES ----
const particleCount = isMobile ? 100 : 300;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount; i++) {
    particlePositions[i*3] = (Math.random() - 0.5) * 200;
    particlePositions[i*3+1] = (Math.random() - 0.5) * 200;
    particlePositions[i*3+2] = (Math.random() - 0.5) * 50 - 10; 
}
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
    color: colors.electron,
    size: 0.3,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ---- 4. LIGHTS ----
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const chipLight = new THREE.PointLight(colors.glowCyan, 1.0, 100);
chipLight.position.set(0, 0, 10);
scene.add(chipLight);

// ---- PARALLAX CONTROLS ----
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    const isNowMobile = window.innerWidth <= 768;
    const newPixelRatio = isNowMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(newPixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ---- ANIMATION LOOP ----
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Subtle parallax (GSAP controls base rotation during intro, mouse adds delta)
    board.rotation.x += ((mouseY * 0.05) - board.rotation.x) * 0.05;
    board.rotation.y += ((mouseX * 0.05) - board.rotation.y) * 0.05;

    // Static background rotation
    particles.rotation.z = time * 0.01;
    
    // Electron Animation 
    electrons.forEach((electron) => {
        const speedMultiplier = 0.5 + Math.sin(electron.progress * Math.PI) * 0.8; 
        electron.progress += electron.baseSpeed * speedMultiplier;
        
        if (electron.progress > 1) {
            electron.progress = 0;
        }
        
        const point = electron.path.getPointAt(electron.progress);
        if (point) {
            electron.mesh.position.copy(point);
            
            let scaleMod = 1.0;
            if (electron.progress < 0.05) {
                scaleMod = electron.progress / 0.05; 
            } else if (electron.progress > 0.95) {
                scaleMod = (1.0 - electron.progress) / 0.05; 
            }
            electron.mesh.scale.setScalar(scaleMod);
        }
    });
    
    // Very very little glow
    auraMesh.scale.setScalar(1.0); 
    auraMesh.material.opacity = 0.1; // extreme subtle
    logoMesh.material.opacity = 0.7; // subtle
    chipLight.intensity = 0.1; // very faint pointlight
    chipLight.distance = 20;

    composer.render();
}

animate();

// ---- 5. MOBILE MENU TOGGLE ----
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// ---- GSAP ANTI-GRAVITY, LENIS & PARALLAX ----
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for buttery smooth scrolling
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo.out
    smooth: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// Smooth Parallax for glow orbs
gsap.utils.toArray('.glow-orb').forEach((orb) => {
    const speed = parseFloat(orb.getAttribute('data-speed'));
    gsap.to(orb, {
        y: () => window.innerHeight * speed * 2,
        ease: "none",
        scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom top",
            scrub: true 
        }
    });
});

// Awwwards Style Soft Reveal for Sections
const sections = document.querySelectorAll('section');
sections.forEach(section => {
    // Select elements to stagger
    const headings = section.querySelectorAll('h1, h2, h3, p:not(.event-card p)');
    const cards = section.querySelectorAll('.glass-panel');
    
    // Initial states
    if(headings.length > 0) gsap.set(headings, { opacity: 0, y: 40 });
    if(cards.length > 0) gsap.set(cards, { opacity: 0, y: 80, scale: 0.95 });
    
    // Create timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: "top 75%", // Triggers nicely when entering
            toggleActions: "play none none reverse"
        }
    });

    if(headings.length > 0) {
        tl.to(headings, {
            opacity: 1, 
            y: 0, 
            duration: 1.6, 
            stagger: 0.1, 
            ease: "expo.out"
        });
    }

    if(cards.length > 0) {
        tl.to(cards, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 2.0,
            stagger: 0.15,
            ease: "expo.out",
            clearProps: "transform" // restore CSS continuous floating animations
        }, "-=1.2"); // Overlap slightly with headings
    }
});

// ================================================================
//  EVENTS MODAL — DATA & INTERACTION
// ================================================================

const EVENT_DATA = {
    paper: {
        icon: '<i class="fas fa-file-code"></i>',
        category: 'Technical Protocol',
        title: 'Paper Presentation',
        accent: false,
        description: 'Showcase your original research and innovative ideas in VLSI Design, Microelectronics, Embedded Systems, and allied domains. Participants will present their work before a panel of faculty judges and receive professional feedback.',
        teamSize: '2 – 3 Members',
        duration: '3 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Round 1', desc: 'Abstract Submission — Submit a 250-word abstract of your paper for screening. Shortlisted teams will be notified 2 days before the event.' },
            { label: 'Round 2', desc: 'Presentation — Shortlisted teams present their paper (PPT) within 8 minutes, followed by a 5-minute Q&A session with the judges.' },
        ],
        rules: [
            'Each team must consist of 2 to 3 members from the same institution.',
            'Papers must be original work; plagiarism will lead to immediate disqualification.',
            'Abstract must be submitted at least 48 hours before the event.',
            'Presentation duration: 8 minutes + 5 minutes Q&A.',
            'Teams must bring their presentation on a USB drive or submit it beforehand.',
            'Use of AI-generated content must be disclosed and is subject to judge discretion.',
            'Judges\' decision is final and binding.',
        ],
        coordinators: [
            { name: 'Vishal R', phone: '+91 98765 43210' },
            { name: 'Priya S', phone: '+91 87654 32109' },
        ],
    },

    quiz: {
        icon: '<i class="fas fa-microchip"></i>',
        category: 'Technical Protocol',
        title: 'Technical Quiz (Tech Q)',
        accent: false,
        description: 'Test the depth of your technical knowledge spanning digital electronics, circuit design, semiconductor physics, VLSI fundamentals, and current industry trends. A fast-paced, high-intensity quiz for the sharpest minds.',
        teamSize: '2 Members',
        duration: '1.5 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Round 1 — Rapid Fire', desc: 'MCQ-based written round. Top teams advance to Round 2.' },
            { label: 'Round 2 — Buzzer Round', desc: 'Teams compete live on buzzer questions across electronics, VLSI, and general tech. Negative marking applies.' },
            { label: 'Round 3 — Final Showdown', desc: 'Top 3 teams face a visual circuit-identification rapid round for the championship.' },
        ],
        rules: [
            'Team size: exactly 2 members.',
            'Mobile phones and electronic devices are strictly prohibited during the quiz.',
            'Negative marking of 0.5 marks per wrong answer applies in rounds 2 and 3.',
            'Buzzer timings are controlled by the quiz master — no delays allowed.',
            'Answers must be given within 10 seconds of the question being read.',
            'Decision of the quiz master is final.',
        ],
        coordinators: [
            { name: 'Arun K', phone: '+91 76543 21098' },
            { name: 'Meena L', phone: '+91 65432 10987' },
        ],
    },

    poster: {
        icon: '<i class="fas fa-chalkboard"></i>',
        category: 'Technical Protocol',
        title: 'Poster Presentation',
        accent: false,
        description: 'Communicate complex engineering concepts through visually engaging, high-impact technical posters. Participants defend their work to a roving panel of judges in an exhibition-style format.',
        teamSize: '2 – 3 Members',
        duration: '2 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Submission', desc: 'Submit digital poster (A1 size, PDF/JPG) by the given deadline for initial review.' },
            { label: 'Exhibition & Defence', desc: 'Display physical posters and defend your work to judges in a 10-minute stand-up discussion per team.' },
        ],
        rules: [
            'Poster size must be A1 (594 × 841 mm); both printed and softcopy required.',
            'Posters must be designed using standard tools (Canva, PowerPoint, Illustrator, etc.).',
            'Content must relate to ECE / VLSI / Embedded / IoT domains.',
            'Teams must be present at their poster stand at all times during judging hours.',
            'No audio or video playback allowed; poster only.',
            'Originality is mandatory; plagiarism leads to disqualification.',
        ],
        coordinators: [
            { name: 'Kavya N', phone: '+91 58765 43210' },
            { name: 'Rajan T', phone: '+91 47654 32109' },
        ],
    },

    doodle: {
        icon: '<i class="fas fa-pen-fancy"></i>',
        category: 'Offline Module',
        title: 'Doodle & Guess',
        accent: true,
        description: 'A hilarious and creative team game where one member draws a tech or general concept on the whiteboard while teammates race to guess the word correctly. Speed, creativity, and teamwork win the day!',
        teamSize: '3 – 4 Members',
        duration: '1 Hour',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1 — Warm Up', desc: 'General topics — easy words. Teams get familiar with the format.' },
            { label: 'Round 2 — Tech Mode', desc: 'Technical VLSI/ECE-themed doodle words. Higher points, strict time limit.' },
            { label: 'Final — Speed Draw', desc: 'Top teams compete in a rapid-fire simultaneous draw — fastest correct guess wins.' },
        ],
        rules: [
            'One member draws at a time; rotation is mandatory after each word.',
            'No verbal hints, finger pointing or mouthing of words allowed.',
            'Each word must be guessed within 60 seconds.',
            'Abbreviations and acronyms are not valid guesses unless specified.',
            'Teams must not interfere with other teams during their turn.',
            'Event coordinators assign words randomly — no swaps.',
        ],
        coordinators: [
            { name: 'Divya M', phone: '+91 99887 76655' },
            { name: 'Santhosh P', phone: '+91 88776 65544' },
        ],
    },

    ipl: {
        icon: '<i class="fas fa-gavel"></i>',
        category: 'Offline Module',
        title: 'IPL Auction',
        accent: true,
        description: 'Experience the thrill of the IPL mega auction! Each team plays the role of an IPL franchise management team, bidding strategically within a budget to build the most balanced and powerful cricket squad.',
        teamSize: '4 – 6 Members',
        duration: '2 Hours',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Briefing', desc: 'Teams receive their franchise name, budget (virtual INR), and rulebook. Strategy time: 10 minutes.' },
            { label: 'Auction Phase', desc: 'Auctioneer calls players one by one. Teams bid within budget. Fastest/highest bidder wins the player.' },
            { label: 'Final Tally', desc: 'Teams submit final squads. Points awarded for balance (batters/bowlers/all-rounders/keeper).' },
        ],
        rules: [
            'Each team starts with a virtual budget of ₹100 Crore.',
            'Minimum squad size: 11 players; maximum: 15.',
            'Each team must have at least 1 wicket-keeper, 3 bowlers, and 3 batters.',
            'No player may be shared between teams.',
            'Budget overspend leads to disqualification of excess players.',
            'Bid increments: minimum ₹10 Lakh per raise.',
            'Auctioneer\'s hammer decision is final — no take-backs.',
        ],
        coordinators: [
            { name: 'Arjun V', phone: '+91 77665 54433' },
            { name: 'Nithya R', phone: '+91 66554 43322' },
        ],
    },

    funq: {
        icon: '<i class="fas fa-brain"></i>',
        category: 'Offline Module',
        title: 'Fun Q',
        accent: true,
        description: 'A lively and entertaining general knowledge quiz covering pop culture, movies, sports, science facts, lateral thinking puzzles, and more. Perfect for quick thinkers who love a good mental challenge!',
        teamSize: '2 Members',
        duration: '1 Hour',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1 — Written', desc: 'MCQ and fill-in-the-blank questions covering GK, current affairs, and pop culture.' },
            { label: 'Round 2 — Audio/Visual', desc: 'Identify songs, movie scenes, and famous personalities from audio/visual clues.' },
            { label: 'Tie-breaker', desc: 'Rapid oral questions for tied teams — first correct answer wins.' },
        ],
        rules: [
            'Teams consist of exactly 2 members.',
            'Electronic devices are not allowed during the quiz.',
            'All answers must be written clearly and legibly.',
            'No communication between teams during the quiz.',
            'Quiz master\'s ruling on ambiguous answers is final.',
            'Bonus star questions carry double points — attempted at team\'s risk.',
        ],
        coordinators: [
            { name: 'Shreya B', phone: '+91 55443 32211' },
            { name: 'Vikram S', phone: '+91 44332 21100' },
        ],
    },
};

// ---- MODAL DOM REFERENCES ----
const modal        = document.getElementById('event-modal');
const modalClose   = document.getElementById('modal-close');
const modalBackdrop = modal.querySelector('.modal-backdrop');

const elIcon        = document.getElementById('modal-icon');
const elCategory    = document.getElementById('modal-category');
const elTitle       = document.getElementById('modal-title');
const elDescription = document.getElementById('modal-description');
const elTeam        = document.getElementById('meta-team');
const elDuration    = document.getElementById('meta-duration');
const elEligibility = document.getElementById('meta-eligibility');
const elRounds      = document.getElementById('modal-rounds');
const elRulesEl     = document.getElementById('modal-rules');
const elCoords      = document.getElementById('modal-coordinators');
const roundsSection = document.getElementById('rounds-section');
const registerBtn   = document.getElementById('modal-register');

function openModal(eventKey) {
    const data = EVENT_DATA[eventKey];
    if (!data) return;

    // Populate
    elIcon.innerHTML        = data.icon;
    elCategory.textContent  = data.category;
    elTitle.textContent     = data.title;
    elDescription.textContent = data.description;
    elTeam.textContent      = data.teamSize;
    elDuration.textContent  = data.duration;
    elEligibility.textContent = data.eligibility;

    // Rounds
    if (data.rounds && data.rounds.length) {
        roundsSection.style.display = 'flex';
        elRounds.innerHTML = data.rounds.map(r =>
            `<div class="round-item">
                <span class="round-number">${r.label}</span>
                <p class="round-desc">${r.desc}</p>
            </div>`
        ).join('');
    } else {
        roundsSection.style.display = 'none';
    }

    // Rules
    elRulesEl.innerHTML = data.rules.map(rule => `<li>${rule}</li>`).join('');

    // Coordinators
    elCoords.innerHTML = data.coordinators.map(c =>
        `<div class="coordinator-card">
            <p class="coordinator-name">${c.name}</p>
            <p class="coordinator-phone">${c.phone}</p>
        </div>`
    ).join('');

    // Accent variant
    if (data.accent) {
        modal.classList.add('modal--accent');
    } else {
        modal.classList.remove('modal--accent');
    }

    // Register button closes modal then scrolls
    registerBtn.onclick = () => closeModal();

    // Scroll to top of modal body
    modal.querySelector('.modal-container').scrollTop = 0;

    // Show
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
}

function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

// Card click handlers
document.querySelectorAll('.event-card[data-event]').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.event));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(card.dataset.event);
        }
    });
});

// Close handlers
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

// ---- 6. SPLASH SCREEN LOGIC (GSAP CINEMATIC INTRO) ----
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splash-screen');
    const title = document.querySelector('.splash-title');
    const subtitle = document.querySelector('.splash-subtitle');
    const line = document.querySelector('.splash-line');
    
    // Create master intro timeline
    const introTl = gsap.timeline({
        onComplete: () => {
            splashScreen.classList.add('hidden');
            document.body.classList.remove('no-scroll');
            document.body.classList.remove('hide-content');
        }
    });

    // 1. Camera Pullback & Board Spin
    introTl.to(camera.position, {
        z: 85,
        duration: 3.0,
        ease: "power3.inOut"
    }, 0);
    
    introTl.to(board.rotation, {
        z: Math.PI * 2,
        duration: 3.0,
        ease: "power3.inOut"
    }, 0);

    // 2. Bloom Power Surge Flash right at apex of pullback
    introTl.to(bloomPass, {
        strength: 6.0,
        radius: 1.5,
        duration: 0.4,
        ease: "power2.in"
    }, 1.4);
    
    introTl.to(bloomPass, {
        strength: 2.0,
        radius: 0.6,
        duration: 1.5,
        ease: "power3.out"
    }, 1.8);

    // 3. Cinematic Typography Reveal
    gsap.set(title, { opacity: 0, scale: 1.1, filter: "blur(15px)", letterSpacing: "20px" });
    gsap.set(subtitle, { opacity: 0, scale: 1.1, filter: "blur(10px)", letterSpacing: "15px" });
    gsap.set(line, { width: "0%" });

    introTl.to(title, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        letterSpacing: "0px",
        duration: 1.5,
        ease: "expo.out"
    }, 1.6);
    
    introTl.to(subtitle, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        letterSpacing: "5px",
        duration: 1.5,
        ease: "expo.out"
    }, 1.7);
    
    introTl.to(line, {
        width: "100%",
        duration: 1.5,
        ease: "expo.out"
    }, 1.6);
    
    // Hold briefly before unlocking screen
    introTl.to({}, { duration: 0.3 }); 
});
