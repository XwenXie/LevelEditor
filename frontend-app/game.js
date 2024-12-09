class Game {
    constructor() {
        // Set up canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up the physics world
        this.world = planck.World({
            gravity: planck.Vec2(0, 20) // Increased gravity for better game feel
        });

        // Physics scale (pixels to meters)
        this.SCALE = 30;

        // Store all physics bodies
        this.bodies = new Map();
        
        // Player properties
        this.player = null;
        this.playerSpeed = 5;
        this.jumpForce = 12;
        this.jumpBoostForce = 0.5;  // Additional force while holding jump
        this.maxJumpTime = 250;     // Maximum time in ms to hold jump
        this.jumpTimeLeft = 0;      // Time left for current jump
        this.canJump = false;
        this.jumpPressed = false;
        this.airControl = 0.7;      // Multiplier for air movement
        
        // Input state
        this.keys = {
            left: false,
            right: false,
            up: false
        };

        // Initialize the game loop
        this.lastTimestamp = 0;
        this.init();
    }

    init() {
        // Create ground
        const groundBody = this.world.createBody({
            type: 'static',
            position: planck.Vec2(0, this.canvas.height / this.SCALE)
        });

        groundBody.createFixture({
            shape: planck.Edge(
                planck.Vec2(-this.canvas.width / this.SCALE, 0),
                planck.Vec2(this.canvas.width / this.SCALE, 0)
            ),
            friction: 0.5
        });

        // Create player
        this.createPlayer();

        // Set up input handlers
        this.setupControls();

        // Load available levels
        this.loadLevelList();

        // Start the game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    createPlayer() {
        // Create player physics body
        const playerBody = this.world.createBody({
            type: 'dynamic',
            position: planck.Vec2(this.canvas.width / (2 * this.SCALE), 0),
            fixedRotation: true // Prevent rotation
        });

        // Create player fixture
        const playerShape = planck.Box(0.5, 1); // 1m x 2m player
        playerBody.createFixture({
            shape: playerShape,
            density: 1.0,
            friction: 0.3,
            restitution: 0
        });

        // Add foot sensor for jump detection
        const sensorShape = planck.Box(0.3, 0.1, planck.Vec2(0, 1));
        playerBody.createFixture({
            shape: sensorShape,
            isSensor: true,
            userData: 'footSensor'
        });

        this.player = playerBody;

        // Set up collision detection
        this.world.on('begin-contact', (contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();
            
            if (fixtureA.getUserData() === 'footSensor' || 
                fixtureB.getUserData() === 'footSensor') {
                this.canJump = true;
            }
        });

        this.world.on('end-contact', (contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();
            
            if (fixtureA.getUserData() === 'footSensor' || 
                fixtureB.getUserData() === 'footSensor') {
                this.canJump = false;
            }
        });
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = true;
                    break;
                case 'w':
                case 'arrowup':
                case ' ':
                    if (!this.jumpPressed && this.canJump) {
                        this.jumpPressed = true;
                        this.jumpTimeLeft = this.maxJumpTime;
                        
                        // Initial jump impulse
                        const vel = this.player.getLinearVelocity();
                        const jumpVel = planck.Vec2(vel.x * 0.5, -this.jumpForce);
                        this.player.setLinearVelocity(jumpVel);
                    }
                    this.keys.up = true;
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = false;
                    break;
                case 'w':
                case 'arrowup':
                case ' ':
                    this.keys.up = false;
                    this.jumpPressed = false;
                    this.jumpTimeLeft = 0;
                    break;
            }
        });
    }

    updatePlayer() {
        if (!this.player) return;

        const vel = this.player.getLinearVelocity();
        let desiredVel = 0;
        
        // Horizontal movement
        if (this.keys.left) desiredVel = -this.playerSpeed;
        if (this.keys.right) desiredVel = this.playerSpeed;

        // Apply air control when jumping
        const controlMultiplier = this.canJump ? 1 : this.airControl;
        const velChange = (desiredVel - vel.x) * controlMultiplier;
        const impulse = this.player.getMass() * velChange;
        
        // Apply horizontal movement
        this.player.applyLinearImpulse(planck.Vec2(impulse, 0), this.player.getWorldCenter());

        // Handle variable jump height
        if (this.jumpTimeLeft > 0 && this.keys.up) {
            // Apply additional upward force while jump is held
            const jumpBoost = planck.Vec2(0, -this.jumpBoostForce);
            this.player.applyLinearImpulse(jumpBoost, this.player.getWorldCenter());
            this.jumpTimeLeft = Math.max(0, this.jumpTimeLeft - 16.667); // Assuming 60fps
        }

        // Limit horizontal velocity
        const currentVel = this.player.getLinearVelocity();
        if (Math.abs(currentVel.x) > this.playerSpeed) {
            this.player.setLinearVelocity(planck.Vec2(
                Math.sign(currentVel.x) * this.playerSpeed,
                currentVel.y
            ));
        }

        // Add slight forward momentum during jump
        if (!this.canJump && (this.keys.left || this.keys.right)) {
            const airMoveForce = planck.Vec2(
                this.keys.left ? -0.3 : (this.keys.right ? 0.3 : 0),
                0
            );
            this.player.applyForce(airMoveForce, this.player.getWorldCenter());
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all level bodies
        this.bodies.forEach(({body, data}) => {
            const position = body.getPosition();
            const angle = body.getAngle();

            this.ctx.save();
            this.ctx.translate(
                position.x * this.SCALE,
                position.y * this.SCALE
            );
            this.ctx.rotate(angle);

            // Draw the block
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(
                -data.width/2,
                -data.height/2,
                data.width,
                data.height
            );

            this.ctx.restore();
        });

        // Draw player
        if (this.player) {
            const position = this.player.getPosition();
            this.ctx.save();
            this.ctx.translate(
                position.x * this.SCALE,
                position.y * this.SCALE
            );

            // Draw player body
            this.ctx.fillStyle = '#FF4081';
            this.ctx.fillRect(
                -15, // half width
                -30, // half height
                30,  // width
                60   // height
            );

            this.ctx.restore();
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }

        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        // Update player
        this.updatePlayer();

        // Update physics world
        this.world.step(deltaTime);

        // Render the game
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    loadLevelList() {
        $.ajax({
            url: "http://localhost:3000/levels",
            method: "GET",
            success: (levelIds) => {
                const $levelSelect = $("#level-select");
                $levelSelect.empty();
                $levelSelect.append('<option value="">Select a Level</option>');
                levelIds.forEach((id) => {
                    $levelSelect.append(`<option value="${id}">${id}</option>`);
                });
            },
            error: (xhr, status, error) => {
                console.error("Error loading level list:", error);
            }
        });
    }

    createLevel(levelData) {
        // Clear existing bodies
        this.bodies.forEach(body => {
            this.world.destroyBody(body);
        });
        this.bodies.clear();

        // Reset player position
        if (this.player) {
            this.player.setPosition(planck.Vec2(
                this.canvas.width / (2 * this.SCALE),
                0
            ));
            this.player.setLinearVelocity(planck.Vec2(0, 0));
        }

        // Create physics bodies for each block
        levelData.forEach(block => {
            const bodyDef = {
                type: 'static',
                position: planck.Vec2(
                    (block.x + block.width/2) / this.SCALE,
                    (block.y + block.height/2) / this.SCALE
                )
            };

            const body = this.world.createBody(bodyDef);
            const shape = planck.Box(
                block.width / (2 * this.SCALE),
                block.height / (2 * this.SCALE)
            );

            const fixture = body.createFixture({
                shape: shape,
                friction: 0.5,
                restitution: 0
            });

            this.bodies.set(block.id, { body, data: block });
        });
    }
}

// Initialize game when document is ready
$(document).ready(() => {
    const game = new Game();

    // Handle level loading
    $("#load-level").click(() => {
        const levelId = $("#level-select").val();
        if (!levelId) {
            alert("Please select a level first!");
            return;
        }

        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "GET",
            success: (levelData) => {
                game.createLevel(levelData);
            },
            error: (xhr, status, error) => {
                console.error("Error loading level:", error);
                alert("Failed to load level: " + error);
            }
        });
    });
});
