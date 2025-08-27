const fs = require('fs');
const path = require('path');

class WriteTracker {
  constructor(options = {}) {
    this.logFile = options.logFile || path.join(__dirname, '../data/write-operations.log');
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Ensure log directory exists
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log('Write tracker initialized');
  }

  async writeJsonFile(filePath, data, metadata = {}) {
    const operation = {
      id: this.generateOperationId(),
      filePath,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(data).length,
      metadata,
      attempts: 0
    };

    return this.executeWithRetry(operation, data);
  }

  async executeWithRetry(operation, data) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      operation.attempts = attempt;
      
      try {
        // Ensure directory exists
        const dir = path.dirname(operation.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        await fs.promises.writeFile(
          operation.filePath, 
          JSON.stringify(data, null, 2), 
          'utf8'
        );

        // Log successful operation
        this.logOperation(operation, 'success');
        console.log(`Write operation successful: ${operation.filePath} (attempt ${attempt})`);
        
        return { success: true, operation };
        
      } catch (error) {
        operation.error = error.message;
        
        if (attempt === this.retryAttempts) {
          // Final attempt failed
          this.logOperation(operation, 'failed');
          console.error(`Write operation failed after ${attempt} attempts: ${operation.filePath} - ${error.message}`);
          
          return { 
            success: false, 
            operation,
            error: error.message 
          };
        } else {
          // Retry after delay
          console.warn(`Write attempt ${attempt} failed for ${operation.filePath}, retrying in ${this.retryDelay}ms: ${error.message}`);
          await this.delay(this.retryDelay);
        }
      }
    }
  }

  readJsonFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        console.log(`Read operation successful: ${filePath}`);
        return JSON.parse(data);
      }
      console.log(`File not found: ${filePath}`);
      return null;
    } catch (error) {
      console.error(`Read operation failed: ${filePath} - ${error.message}`);
      return null;
    }
  }

  logOperation(operation, status) {
    const logEntry = {
      ...operation,
      status,
      completedAt: new Date().toISOString()
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error(`Failed to write to operation log: ${error.message}`);
    }
  }

  generateOperationId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getFailedOperations(hours = 24) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = await fs.promises.readFile(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const failedOps = lines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(op => op && op.status === 'failed')
        .filter(op => new Date(op.timestamp) > cutoff)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return failedOps;
      
    } catch (error) {
      console.error(`Failed to read operation log: ${error.message}`);
      return [];
    }
  }

  async getOperationStats(hours = 24) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return { total: 0, successful: 0, failed: 0, failureRate: 0 };
      }

      const content = await fs.promises.readFile(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const operations = lines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(op => op && new Date(op.timestamp) > cutoff);

      const total = operations.length;
      const successful = operations.filter(op => op.status === 'success').length;
      const failed = operations.filter(op => op.status === 'failed').length;
      const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

      return { total, successful, failed, failureRate };
      
    } catch (error) {
      console.error(`Failed to calculate operation stats: ${error.message}`);
      return { total: 0, successful: 0, failed: 0, failureRate: 0 };
    }
  }
}

module.exports = WriteTracker;