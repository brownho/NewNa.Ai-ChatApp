// Model parameters module
class ModelParameters {
  constructor() {
    this.defaults = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      seed: -1,
      numPredict: -1,
      stop: []
    };
    
    this.parameters = { ...this.defaults };
    this.loadSavedParameters();
    this.init();
  }
  
  init() {
    // Create UI if container exists
    const container = utils.dom.$('#modelParametersContainer');
    if (container) {
      this.createUI(container);
    }
  }
  
  loadSavedParameters() {
    const saved = utils.storage.get('modelParameters');
    if (saved) {
      this.parameters = { ...this.defaults, ...saved };
    }
  }
  
  saveParameters() {
    utils.storage.set('modelParameters', this.parameters);
  }
  
  getParameters() {
    return { ...this.parameters };
  }
  
  setParameter(name, value) {
    if (name in this.defaults) {
      this.parameters[name] = value;
      this.saveParameters();
    }
  }
  
  resetToDefaults() {
    this.parameters = { ...this.defaults };
    this.saveParameters();
    this.updateUI();
    utils.showNotification('Parameters reset to defaults', 'success');
  }
  
  createUI(container) {
    const html = `
      <div class="parameters-section">
        <h3>Model Parameters</h3>
        <div class="parameter-grid">
          ${this.createSlider('temperature', 'Temperature', 0, 2, 0.1)}
          ${this.createSlider('topP', 'Top P', 0, 1, 0.1)}
          ${this.createSlider('topK', 'Top K', 1, 100, 1)}
          ${this.createSlider('repeatPenalty', 'Repeat Penalty', 0.5, 2, 0.1)}
          ${this.createNumberInput('seed', 'Seed (-1 for random)')}
          ${this.createNumberInput('numPredict', 'Max Tokens (-1 for default)')}
        </div>
        <button id="resetParams" class="btn btn-secondary">Reset to Defaults</button>
      </div>
    `;
    
    container.innerHTML = html;
    this.attachEventListeners();
    this.updateUI();
  }
  
  createSlider(name, label, min, max, step) {
    return `
      <div class="parameter-item">
        <label for="${name}">${label}: <span id="${name}Value">${this.parameters[name]}</span></label>
        <input type="range" id="${name}" name="${name}" 
               min="${min}" max="${max}" step="${step}" 
               value="${this.parameters[name]}" class="parameter-slider">
      </div>
    `;
  }
  
  createNumberInput(name, label) {
    return `
      <div class="parameter-item">
        <label for="${name}">${label}</label>
        <input type="number" id="${name}" name="${name}" 
               value="${this.parameters[name]}" class="parameter-input">
      </div>
    `;
  }
  
  attachEventListeners() {
    // Sliders
    ['temperature', 'topP', 'topK', 'repeatPenalty'].forEach(param => {
      const slider = utils.dom.$(`#${param}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          this.setParameter(param, value);
          utils.dom.$(`#${param}Value`).textContent = value;
        });
      }
    });
    
    // Number inputs
    ['seed', 'numPredict'].forEach(param => {
      const input = utils.dom.$(`#${param}`);
      if (input) {
        input.addEventListener('change', (e) => {
          const value = parseInt(e.target.value) || -1;
          this.setParameter(param, value);
        });
      }
    });
    
    // Reset button
    const resetBtn = utils.dom.$('#resetParams');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefaults());
    }
  }
  
  updateUI() {
    // Update all UI elements with current values
    Object.entries(this.parameters).forEach(([name, value]) => {
      const element = utils.dom.$(`#${name}`);
      if (element) {
        element.value = value;
      }
      
      const valueDisplay = utils.dom.$(`#${name}Value`);
      if (valueDisplay) {
        valueDisplay.textContent = value;
      }
    });
  }
}

// Initialize and expose globally
window.modelParametersModule = new ModelParameters();