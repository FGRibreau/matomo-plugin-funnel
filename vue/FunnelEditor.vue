<template>
  <div class="funnel-editor">
    <h3>Funnel Steps Configuration</h3>
    
    <div v-if="steps.length === 0" class="alert alert-info">
      No steps defined. Add a step to get started.
    </div>

    <div v-for="(step, index) in steps" :key="index" class="step-card">
      <div class="step-header">
        <span class="step-number">Step {{ index + 1 }}</span>
        <div class="step-actions">
           <button type="button" @click="moveStep(index, -1)" :disabled="index === 0" title="Move Up">↑</button>
           <button type="button" @click="moveStep(index, 1)" :disabled="index === steps.length - 1" title="Move Down">↓</button>
           <button type="button" @click="removeStep(index)" class="btn-danger" title="Remove">×</button>
        </div>
      </div>
      
      <div class="step-body">
        <div class="form-group">
            <label>Name</label>
            <input type="text" v-model="step.name" class="form-control" placeholder="e.g. Landing Page" required>
        </div>
        
        <div class="form-group inline-conditions">
            <div class="condition-part">
                <label>Logic</label>
                <select v-model="step.comparison" class="form-control">
                    <option value="url">URL</option>
                    <option value="path">URL Path</option>
                    <option value="page_title">Page Title</option>
                    <option value="event_category">Event Category</option>
                    <option value="event_action">Event Action</option>
                    <option value="event_name">Event Name</option>
                    <option value="search_query">Search Query</option>
                </select>
            </div>
            
            <div class="condition-part">
                <label>Operator</label>
                <select v-model="step.operator" class="form-control">
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts with</option>
                    <option value="ends_with">Ends with</option>
                    <option value="regex">Matches Regex</option>
                </select>
            </div>
            
            <div class="condition-part flex-grow">
                <label>Pattern</label>
                <input type="text" v-model="step.pattern" class="form-control" placeholder="value to match">
            </div>
        </div>
        
        <div class="checkbox">
            <label>
                <input type="checkbox" v-model="step.required"> Required Step
            </label>
        </div>
      </div>
    </div>
    
    <button type="button" @click="addStep" class="btn btn-primary add-step-btn">+ Add Step</button>
    
    <hr>
    
    <div class="validator-section">
        <h4>Validate Steps</h4>
        <p>Enter a URL (or value) to test which step it matches.</p>
        <div class="flex-row">
            <input type="text" v-model="testValue" class="form-control" placeholder="http://example.com/checkout">
            <button type="button" @click="validate" class="btn btn-success">Test</button>
        </div>
        
        <div v-if="validationResults.length > 0" class="validation-results">
            <ul>
                <li v-for="(res, idx) in validationResults" :key="idx" :class="{ 'matched': res.matched, 'unmatched': !res.matched }">
                    Step {{ res.step_index + 1 }} ({{ res.step_name }}): {{ res.matched ? 'MATCH' : 'No Match' }}
                </li>
            </ul>
        </div>
    </div>

    <!-- Hidden Input to sync with Form -->
    <input type="hidden" name="steps" :value="JSON.stringify(steps)">
  </div>
</template>

<script>
export default {
  name: 'FunnelEditor',
  props: {
    initialSteps: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      steps: JSON.parse(JSON.stringify(this.initialSteps)), // Deep copy
      testValue: '',
      validationResults: []
    };
  },
  methods: {
    addStep() {
      this.steps.push({ 
          name: '', 
          comparison: 'url', 
          operator: 'contains', 
          pattern: '',
          required: false
      });
    },
    removeStep(index) {
        if (confirm('Remove this step?')) {
            this.steps.splice(index, 1);
        }
    },
    moveStep(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.steps.length) {
            const temp = this.steps[newIndex];
            this.$set(this.steps, newIndex, this.steps[index]);
            this.$set(this.steps, index, temp);
        }
    },
    validate() {
        // In real app, this might call the API.
        // For now, we simulate basic validation locally or assume an API helper exists.
        // We will just do a simple local check or emit an event.
        // Let's rely on a hypothetical global or just simulate logic.
        
        this.validationResults = this.steps.map((step, idx) => {
            let matched = false;
            // Simple mock validation for UI feedback
            if (step.operator === 'contains' && this.testValue.includes(step.pattern)) matched = true;
            if (step.operator === 'equals' && this.testValue === step.pattern) matched = true;
            // ... strict implementation requires the PHP logic logic or duplicating it in JS.
            
            return {
                step_index: idx,
                step_name: step.name,
                matched: matched
            };
        });
    }
  }
}
</script>

<style scoped>
.step-card {
    border: 1px solid #e0e0e0;
    padding: 15px;
    margin-bottom: 15px;
    background: #fff;
    border-radius: 4px;
}
.step-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
}
.step-number {
    font-weight: bold;
    color: #666;
}
.inline-conditions {
    display: flex;
    gap: 10px;
}
.condition-part {
    flex: 1;
}
.flex-grow {
    flex: 2;
}
.matched { color: green; font-weight: bold; }
.unmatched { color: red; }
</style>