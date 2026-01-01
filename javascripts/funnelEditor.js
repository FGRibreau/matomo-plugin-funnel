(function() {
    // Check if Vue is available (Matomo core usually provides it)
    if (typeof Vue === 'undefined') {
        return;
    }

    Vue.component('funnel-editor', {
        template: `
          <div class="funnel-editor">
            <h3>Funnel Steps Configuration</h3>
            
            <div v-if="steps.length === 0" class="alert alert-info">
              No steps defined. Add a step to get started.
            </div>

            <div v-for="(step, stepIndex) in steps" :key="stepIndex" class="step-card">
              <div class="step-header">
                <span class="step-number">Step {{ stepIndex + 1 }} - {{ step.name || 'Untitled Step' }}</span>
                <div class="step-actions">
                   <button type="button" @click="moveStep(stepIndex, -1)" :disabled="stepIndex === 0" title="Move Up" class="btn btn-sm">↑</button>
                   <button type="button" @click="moveStep(stepIndex, 1)" :disabled="stepIndex === steps.length - 1" title="Move Down" class="btn btn-sm">↓</button>
                   <button type="button" @click="removeStep(stepIndex)" class="btn btn-danger btn-sm" title="Remove">×</button>
                </div>
              </div>
              
              <div class="step-body">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" v-model="step.name" class="form-control" placeholder="e.g. Landing Page" required>
                </div>

                <div class="checkbox" style="margin-bottom: 15px;">
                    <label>
                        <input type="checkbox" v-model="step.required"> Required Step
                        <span class="help-block">Visitor must pass through this step for the funnel to continue.</span>
                    </label>
                </div>

                <h4>Conditions (OR Logic)</h4>
                <div v-if="step.conditions.length === 0" class="alert alert-warning">
                    No conditions for this step. Add one.
                </div>
                <div v-for="(condition, condIndex) in step.conditions" :key="condIndex" class="condition-group" style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 3px;">
                    <div class="condition-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>Condition {{ condIndex + 1 }}</strong>
                        <button type="button" @click="removeCondition(stepIndex, condIndex)" class="btn btn-danger btn-xs" title="Remove Condition">×</button>
                    </div>
                    <div class="row">
                        <div class="col-md-3">
                            <label>Logic</label>
                            <select v-model="condition.comparison" class="form-control">
                                <option value="url">URL</option>
                                <option value="path">URL Path</option>
                                <option value="page_title">Page Title</option>
                                <option value="event_category">Event Category</option>
                                <option value="event_action">Event Action</option>
                                <option value="event_name">Event Name</option>
                                <option value="search_query">Search Query</option>
                            </select>
                        </div>

                        <div class="col-md-3">
                            <label>Operator</label>
                            <select v-model="condition.operator" class="form-control">
                                <option value="equals">Equals</option>
                                <option value="not_equals">Does not equal</option>
                                <option value="contains">Contains</option>
                                <option value="not_contains">Does not contain</option>
                                <option value="starts_with">Starts with</option>
                                <option value="not_starts_with">Does not start with</option>
                                <option value="ends_with">Ends with</option>
                                <option value="not_ends_with">Does not end with</option>
                                <option value="regex">Matches Regex</option>
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label>Pattern</label>
                            <div class="input-group">
                                <input type="text" v-model="condition.pattern" class="form-control" placeholder="value to match">
                                <span class="input-group-btn">
                                    <button class="btn btn-default" type="button" @click="openSuggestions(stepIndex, condIndex)" title="Known Values">
                                        <span class="icon-help">?</span>
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="row" style="margin-top: 10px;">
                        <div class="col-md-6">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" v-model="condition.case_sensitive"> Case Sensitive
                                    <span class="help-block">Distinguish between "Page" and "page".</span>
                                </label>
                            </div>
                        </div>
                        <div class="col-md-6" v-if="condition.comparison === 'url'">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" v-model="condition.ignore_query_params"> Ignore Query Parameters
                                    <span class="help-block">Match "page.html" and "page.html?id=123".</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" @click="addCondition(stepIndex)" class="btn btn-sm btn-info">+ Add Condition (OR)</button>
              </div>
            </div>

            <button type="button" @click="addStep" class="btn btn-primary add-step-btn">+ Add Step</button>

            <hr>

            <div class="validator-section">
                <h4>Validate Steps</h4>
                <p>Enter a URL (or value) to test which step it matches.</p>
                <div class="row">
                    <div class="col-md-9">
                        <input type="text" v-model="testValue" class="form-control" placeholder="http://example.com/checkout">
                    </div>
                    <div class="col-md-3">
                        <button type="button" @click="validate" class="btn btn-success">Test</button>
                    </div>
                </div>

                <div v-if="validationResults.length > 0" class="validation-results" style="margin-top: 10px;">
                    <ul class="list-group">
                        <li v-for="(res, idx) in validationResults" :key="idx" class="list-group-item" :class="{ 'list-group-item-success': res.matched, 'list-group-item-danger': !res.matched }">
                            Step {{ res.step_index + 1 }} ({{ res.step_name }}): {{ res.matched ? 'MATCH' : 'No Match' }}
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Hidden Input to sync with Form -->
            <input type="hidden" name="steps" :value="JSON.stringify(steps)">

            <!-- Suggestions Modal (Simple overlay) -->
            <div v-if="showSuggestions" class="suggestions-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 5px; width: 500px; max-height: 80vh; overflow-y: auto;">
                    <h4>Known Values ({{ suggestionType }})</h4>
                    <ul class="list-group">
                        <li v-for="val in suggestions" class="list-group-item" style="cursor: pointer;" @click="selectSuggestion(val)">
                            {{ val }}
                        </li>
                    </ul>
                    <div v-if="suggestions.length === 0">No recent values found.</div>
                    <button type="button" class="btn btn-default" @click="showSuggestions = false" style="margin-top: 10px;">Close</button>
                </div>
            </div>
          </div>
        `,
        props: ['initialSteps'],
        data: function() {
            // Ensure initialSteps are parsed correctly for the new structure
            var parsedSteps = this.initialSteps ? JSON.parse(JSON.stringify(this.initialSteps)) : [];
            parsedSteps.forEach(step => {
                // If legacy step, convert to new conditions array
                if (!step.conditions) {
                    step.conditions = [{
                        comparison: step.comparison || 'url',
                        operator: step.operator || 'contains',
                        pattern: step.pattern || '',
                        case_sensitive: step.case_sensitive || false,
                        ignore_query_params: step.ignore_query_params || false
                    }];
                    // Clean up legacy properties
                    delete step.comparison;
                    delete step.operator;
                    delete step.pattern;
                    delete step.case_sensitive;
                    delete step.ignore_query_params;
                }
            });

            return {
                steps: parsedSteps,
                testValue: '',
                validationResults: [],
                showSuggestions: false,
                suggestions: [],
                suggestionType: '',
                activeStepIndex: -1,
                activeConditionIndex: -1 // New property for suggestions
            };
        },
        methods: {
            addStep: function() {
                this.steps.push({
                    name: '',
                    required: false,
                    conditions: [{
                        comparison: 'url',
                        operator: 'contains',
                        pattern: '',
                        case_sensitive: false,
                        ignore_query_params: false
                    }]
                });
            },
            removeStep: function(index) {
                if (confirm('Remove this step?')) {
                    this.steps.splice(index, 1);
                }
            },
            moveStep: function(index, direction) {
                var newIndex = index + direction;
                if (newIndex >= 0 && newIndex < this.steps.length) {
                    var temp = this.steps[newIndex];
                    this.$set(this.steps, newIndex, this.steps[index]);
                    this.$set(this.steps, index, temp);
                }
            },
            addCondition: function(stepIndex) {
                this.steps[stepIndex].conditions.push({
                    comparison: 'url',
                    operator: 'contains',
                    pattern: '',
                    case_sensitive: false,
                    ignore_query_params: false
                });
            },
            removeCondition: function(stepIndex, condIndex) {
                if (confirm('Remove this condition?')) {
                    this.steps[stepIndex].conditions.splice(condIndex, 1);
                }
            },
            openSuggestions: function(stepIndex, condIndex) {
                var condition = this.steps[stepIndex].conditions[condIndex];
                var type = condition.comparison;
                // Map to API types
                if (type === 'url' || type === 'path') type = 'url';
                else if (type === 'page_title') type = 'page_title';
                else if (type.startsWith('event_')) type = 'event_name'; // Simplified
                else {
                    alert('Suggestions not available for this type.');
                    return;
                }
                
                this.suggestionType = type;
                this.activeStepIndex = stepIndex;
                this.activeConditionIndex = condIndex;
                this.fetchSuggestions(type);
            },
            fetchSuggestions: function(type) {
                var self = this;
                var idSite = (new URLSearchParams(window.location.search)).get('idSite');
                var url = 'index.php?module=API&method=Funnels.getSuggestedValues&idSite=' + idSite + '&type=' + type + '&format=JSON';
                
                fetch(url)
                .then(response => response.json())
                .then(data => {
                    self.suggestions = data;
                    self.showSuggestions = true;
                });
            },
            selectSuggestion: function(val) {
                if (this.activeStepIndex > -1 && this.activeConditionIndex > -1) {
                    this.steps[this.activeStepIndex].conditions[this.activeConditionIndex].pattern = val;
                }
                this.showSuggestions = false;
            },
            validate: function() {
                var self = this;
                var idSite = (new URLSearchParams(window.location.search)).get('idSite');
                if (!idSite) {
                    alert('Cannot determine Site ID');
                    return;
                }

                var url = 'index.php?module=API&method=Funnels.validateFunnelSteps&idSite=' + idSite + '&format=JSON';

                var params = new URLSearchParams();
                params.append('steps', JSON.stringify(this.steps));
                params.append('testUrl', this.testValue);

                fetch(url, {
                    method: 'POST',
                    body: params
                })
                .then(response => response.json())
                .then(data => {
                    self.validationResults = data;
                })
                .catch(error => {
                    console.error('Validation failed:', error);
                    alert('Validation failed. See console.');
                });
            }
        }
    });

    // Mount logic if we are on the edit page
    document.addEventListener('DOMContentLoaded', function() {
        var el = document.getElementById('funnel-editor-app');
        if (el) {
            new Vue({
                el: el
            });
        }
    });

})();
