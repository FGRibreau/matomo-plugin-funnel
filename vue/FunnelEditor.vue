<template>
  <div class="funnel-editor">
    <h3>Funnel Steps Configuration</h3>

    <!-- Helpful info box for users -->
    <div class="alert alert-warning comparison-help">
      <strong>💡 Configuration Tips:</strong>
      <ul>
        <li><strong>URL Path</strong> (recommended): Use for matching page paths like <code>/contact</code>, <code>/checkout</code>. This is the most common and reliable option.</li>
        <li><strong>URL</strong>: Matches the full URL <em>without</em> the http(s):// prefix. Matomo stores URLs like <code>example.com/page</code>, not <code>https://example.com/page</code>.</li>
        <li><strong>Event fields</strong>: Use when tracking custom events (e.g., form submissions, button clicks).</li>
      </ul>
    </div>

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
                <label>Match Type <span class="help-icon" :title="getComparisonHelp(step.comparison)">?</span></label>
                <select v-model="step.comparison" class="form-control" @change="onComparisonChange(index)">
                    <option value="path">URL Path (recommended)</option>
                    <option value="url">Full URL (without scheme)</option>
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
                <input type="text" v-model="step.pattern" class="form-control" :placeholder="getPatternPlaceholder(step.comparison)">
                <small class="pattern-hint">{{ getPatternHint(step) }}</small>
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
        <h4>🧪 Test Your Configuration</h4>
        <p>Enter a test URL to verify which steps match. This helps ensure your funnel will capture the right pages.</p>
        <div class="flex-row">
            <input type="text" v-model="testValue" class="form-control" placeholder="https://example.com/checkout or /checkout">
            <button type="button" @click="validate" class="btn btn-success">Test</button>
        </div>
        <small class="test-hint">Tip: For URL Path matching, enter just the path (e.g., <code>/contact</code>). For Full URL, enter without https:// (e.g., <code>example.com/contact</code>).</small>

        <div v-if="validationResults.length > 0" class="validation-results">
            <ul>
                <li v-for="(res, idx) in validationResults" :key="idx" :class="{ 'matched': res.matched, 'unmatched': !res.matched }">
                    Step {{ res.step_index + 1 }} ({{ res.step_name }}):
                    <span v-if="res.matched">✅ MATCH</span>
                    <span v-else>❌ No Match</span>
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
          comparison: 'path', // Default to path (most common use case)
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
    onComparisonChange(index) {
        // Clear pattern when comparison type changes to avoid confusion
        // User should re-enter the pattern for the new comparison type
    },
    getComparisonHelp(comparison) {
        const helpTexts = {
            'path': 'URL Path: Matches the path portion only (e.g., /contact, /checkout/step1). Most reliable for page matching.',
            'url': 'Full URL: Matches the complete URL WITHOUT http(s)://. Matomo stores URLs like "example.com/page", not "https://example.com/page".',
            'page_title': 'Page Title: Matches the HTML <title> tag of the page.',
            'event_category': 'Event Category: Matches the category parameter of tracked events.',
            'event_action': 'Event Action: Matches the action parameter of tracked events (e.g., "submit", "click").',
            'event_name': 'Event Name: Matches the name parameter of tracked events.',
            'search_query': 'Search Query: Matches internal site search queries.'
        };
        return helpTexts[comparison] || '';
    },
    getPatternPlaceholder(comparison) {
        const placeholders = {
            'path': '/contact or /checkout',
            'url': 'example.com/contact (no https://)',
            'page_title': 'Contact Us - Company Name',
            'event_category': 'Form',
            'event_action': 'submit',
            'event_name': 'Contact Form',
            'search_query': 'product search term'
        };
        return placeholders[comparison] || 'value to match';
    },
    getPatternHint(step) {
        if (step.comparison === 'url' && step.pattern.startsWith('http')) {
            return '⚠️ Remove http(s):// prefix - Matomo stores URLs without the scheme';
        }
        if (step.comparison === 'url' && step.pattern.startsWith('/')) {
            return '💡 Consider using "URL Path" instead for path-only matching';
        }
        if (step.comparison === 'path' && step.pattern.includes('://')) {
            return '⚠️ For path matching, use just the path portion (e.g., /contact)';
        }
        return '';
    },
    validate() {
        // Prepare test value based on what user enters
        let testUrl = this.testValue;

        this.validationResults = this.steps.map((step, idx) => {
            let matched = false;
            let valueToTest = testUrl;

            // For path comparison, extract path from URL if full URL was entered
            if (step.comparison === 'path') {
                try {
                    if (testUrl.includes('://')) {
                        const url = new URL(testUrl);
                        valueToTest = url.pathname;
                    } else if (!testUrl.startsWith('/')) {
                        // Assume it's a path without leading slash
                        valueToTest = '/' + testUrl;
                    }
                } catch (e) {
                    // Keep original value if URL parsing fails
                }
            }

            // For URL comparison, strip scheme if present
            if (step.comparison === 'url') {
                valueToTest = testUrl.replace(/^https?:\/\//, '');
            }

            // Simple validation logic
            const pattern = step.pattern;
            switch (step.operator) {
                case 'contains':
                    matched = valueToTest.includes(pattern);
                    break;
                case 'equals':
                    matched = valueToTest === pattern;
                    break;
                case 'starts_with':
                    matched = valueToTest.startsWith(pattern);
                    break;
                case 'ends_with':
                    matched = valueToTest.endsWith(pattern);
                    break;
                case 'regex':
                    try {
                        matched = new RegExp(pattern).test(valueToTest);
                    } catch (e) {
                        matched = false;
                    }
                    break;
            }

            return {
                step_index: idx,
                step_name: step.name || `Step ${idx + 1}`,
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
    flex-wrap: wrap;
}
.condition-part {
    flex: 1;
    min-width: 150px;
}
.flex-grow {
    flex: 2;
}
.matched { color: green; font-weight: bold; }
.unmatched { color: #666; }
.comparison-help {
    margin-bottom: 20px;
    font-size: 13px;
}
.comparison-help ul {
    margin: 10px 0 0 0;
    padding-left: 20px;
}
.comparison-help li {
    margin-bottom: 5px;
}
.comparison-help code {
    background: rgba(0,0,0,0.05);
    padding: 2px 5px;
    border-radius: 3px;
}
.help-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #666;
    color: #fff;
    font-size: 11px;
    text-align: center;
    line-height: 16px;
    cursor: help;
    margin-left: 4px;
}
.pattern-hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #e67e22;
}
.test-hint {
    display: block;
    margin-top: 8px;
    color: #666;
}
.test-hint code {
    background: rgba(0,0,0,0.05);
    padding: 2px 5px;
    border-radius: 3px;
}
.validation-results {
    margin-top: 15px;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 4px;
}
.validation-results ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.validation-results li {
    padding: 5px 0;
    border-bottom: 1px solid #eee;
}
.validation-results li:last-child {
    border-bottom: none;
}
.flex-row {
    display: flex;
    gap: 10px;
}
.flex-row .form-control {
    flex: 1;
}
</style>
