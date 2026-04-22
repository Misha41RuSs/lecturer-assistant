const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Add fetch polyfill for Node.js
global.fetch = require('node-fetch')

class ServiceManager {
	constructor() {
		this.services = []
		this.isShuttingDown = false
	}

	async startServices() {
		console.log('Starting backend services...')

		try {
			// Check if Docker is running
			await this.checkDocker()

			// Start Docker Compose services
			await this.startDockerServices()

			// Wait for services to be ready
			await this.waitForServices()

			console.log('All services started successfully!')
			return true
		} catch (error) {
			console.error('Failed to start services:', error.message)
			return false
		}
	}

	async checkDocker() {
		return new Promise((resolve, reject) => {
			const docker = spawn('docker', ['--version'], { stdio: 'pipe' })
			docker.on('close', code => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error('Docker is not installed or not running'))
				}
			})
		})
	}

	async startDockerServices() {
		const projectRoot = path.resolve(__dirname, '../..')
		const dockerComposePath = path.join(projectRoot, 'docker-compose.yml')

		if (!fs.existsSync(dockerComposePath)) {
			throw new Error('docker-compose.yml not found')
		}

		return new Promise((resolve, reject) => {
			const dockerCompose = spawn('docker-compose', ['up', '-d'], {
				cwd: projectRoot,
				stdio: ['pipe', 'pipe', 'pipe']
			})

			let output = ''
			dockerCompose.stdout.on('data', data => {
				output += data.toString()
				console.log('Docker Compose:', data.toString().trim())
			})

			dockerCompose.stderr.on('data', data => {
				console.error('Docker Compose Error:', data.toString().trim())
			})

			dockerCompose.on('close', code => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`Docker Compose failed with code ${code}`))
				}
			})
		})
	}

	async waitForServices() {
		const services = [
			{ name: 'Admin Gateway', url: 'http://localhost:8080' },
			{ name: 'Content Service', url: 'http://localhost:8081' },
			{ name: 'Lecture Broadcasting', url: 'http://localhost:8082' },
			{ name: 'Quiz Service', url: 'http://localhost:8083' },
			{ name: 'Analytics Service', url: 'http://localhost:8084' }
		]

		console.log('Waiting for services to be ready...')

		for (const service of services) {
			await this.waitForService(service)
		}
	}

	async waitForService(service) {
		const maxAttempts = 30
		const delay = 2000

		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await fetch(`${service.url}/actuator/health`)
				if (response.ok) {
					console.log(`\u2713 ${service.name} is ready`)
					return
				}
			} catch (error) {
				// Try alternative health check
				try {
					const response = await fetch(`${service.url}`)
					if (response.ok || response.status === 404) {
						console.log(`\u2713 ${service.name} is ready`)
						return
					}
				} catch (altError) {
					// Service not ready yet
				}
			}

			console.log(`Waiting for ${service.name}... (${i + 1}/${maxAttempts})`)
			await new Promise(resolve => setTimeout(resolve, delay))
		}

		throw new Error(`${service.name} failed to start within timeout`)
	}

	async stopServices() {
		if (this.isShuttingDown) return
		this.isShuttingDown = true

		console.log('Stopping backend services...')

		const projectRoot = path.resolve(__dirname, '../..')

		return new Promise(resolve => {
			const dockerCompose = spawn('docker-compose', ['down'], {
				cwd: projectRoot,
				stdio: ['pipe', 'pipe', 'pipe']
			})

			dockerCompose.on('close', () => {
				console.log('Services stopped')
				resolve()
			})
		})
	}
}

// Export for use in Electron main process
module.exports = ServiceManager

// If running directly
if (require.main === module) {
	const manager = new ServiceManager()

	manager
		.startServices()
		.then(success => {
			if (success) {
				console.log('Services are running. Press Ctrl+C to stop.')

				// Handle graceful shutdown
				process.on('SIGINT', async () => {
					await manager.stopServices()
					process.exit(0)
				})

				// Keep process alive
				process.stdin.resume()
			} else {
				process.exit(1)
			}
		})
		.catch(error => {
			console.error('Startup failed:', error)
			process.exit(1)
		})
}
