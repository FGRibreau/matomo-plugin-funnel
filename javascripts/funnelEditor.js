(function() {
    'use strict';

    // Wait for Matomo's Vue to be available
    function initFunnelEditor() {
        var el = document.getElementById('funnel-editor-app');
        if (!el) {
            return;
        }

        // Check if Vue 3 is available (Matomo 5+)
        if (typeof window.Vue === 'undefined' || !window.Vue.createApp) {
            console.error('FunnelInsights: Vue 3 not available');
            return;
        }

        var Vue = window.Vue;

        var FunnelEditorComponent = {
            template: `
              <div class="funnel-editor">
                <h3>Funnel Steps Configuration</h3>

                <div v-if="steps.length === 0" class="notification system notification-info">
                  No steps defined. Add a step to get started.
                </div>

                <div v-for="(step, stepIndex) in steps" :key="stepIndex" class="step-card card" style="margin-bottom: 15px;">
                  <div class="card-content">
                    <div class="step-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                      <span class="step-number" style="font-weight: bold;">Step {{ stepIndex + 1 }} - {{ step.name || 'Untitled Step' }}</span>
                      <div class="step-actions">
                         <button type="button" @click="moveStep(stepIndex, -1)" :disabled="stepIndex === 0" title="Move Up" class="btn btn-sm" style="margin-right: 5px;">&#8593;</button>
                         <button type="button" @click="moveStep(stepIndex, 1)" :disabled="stepIndex === steps.length - 1" title="Move Down" class="btn btn-sm" style="margin-right: 5px;">&#8595;</button>
                         <button type="button" @click="removeStep(stepIndex)" class="btn btn-sm" style="color: #d32f2f;" title="Remove">&times;</button>
                      </div>
                    </div>

                    <div class="step-body">
                      <div class="form-group row">
                          <div class="col s12">
                              <label>Step Name</label>
                              <input type="text" v-model="step.name" class="form-control" placeholder="e.g. Landing Page" required>
                          </div>
                      </div>

                      <div class="form-group row" style="margin-top: 10px;">
                          <div class="col s12">
                              <label>
                                  <input type="checkbox" v-model="step.required"> Required Step
                              </label>
                              <span class="form-description">Visitor must pass through this step for the funnel to continue.</span>
                          </div>
                      </div>

                      <h4 style="margin-top: 15px;">Conditions (OR Logic)</h4>
                      <div v-if="step.conditions.length === 0" class="notification system notification-warning">
                          No conditions for this step. Add one.
                      </div>
                      <div v-for="(condition, condIndex) in step.conditions" :key="condIndex" class="condition-group" style="border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 4px; background: #fafafa;">
                          <div class="condition-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                              <strong>Condition {{ condIndex + 1 }}</strong>
                              <button type="button" @click="removeCondition(stepIndex, condIndex)" class="btn btn-sm" style="color: #d32f2f;" title="Remove Condition">&times;</button>
                          </div>
                          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                              <div style="flex: 1; min-width: 150px;">
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

                              <div style="flex: 1; min-width: 150px;">
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

                              <div style="flex: 2; min-width: 200px;">
                                  <label>Pattern</label>
                                  <input type="text" v-model="condition.pattern" class="form-control" placeholder="value to match">
                              </div>
                          </div>
                          <div style="display: flex; gap: 20px; margin-top: 10px; flex-wrap: wrap;">
                              <label style="display: flex; align-items: center; gap: 5px;">
                                  <input type="checkbox" v-model="condition.case_sensitive"> Case Sensitive
                              </label>
                              <label v-if="condition.comparison === 'url'" style="display: flex; align-items: center; gap: 5px;">
                                  <input type="checkbox" v-model="condition.ignore_query_params"> Ignore Query Parameters
                              </label>
                          </div>
                      </div>
                      <button type="button" @click="addCondition(stepIndex)" class="btn btn-flat" style="margin-top: 5px;">+ Add Condition (OR)</button>
                    </div>
                  </div>
                </div>

                <button type="button" @click="addStep" class="btn">+ Add Step</button>

                <hr style="margin: 20px 0;">

                <div class="validator-section card">
                    <div class="card-content">
                        <h4>Validate Steps</h4>
                        <p class="form-description">Enter a URL (or value) to test which step it matches.</p>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <input type="text" v-model="testValue" class="form-control" placeholder="http://example.com/checkout" style="flex: 1;">
                            <button type="button" @click="validate" class="btn">Test</button>
                        </div>

                        <div v-if="validationResults.length > 0" class="validation-results">
                            <div v-for="(res, idx) in validationResults" :key="idx"
                                 :style="{ padding: '8px 12px', marginBottom: '5px', borderRadius: '4px', background: res.matched ? '#e8f5e9' : '#ffebee', color: res.matched ? '#2e7d32' : '#c62828' }">
                                Step {{ res.step_index + 1 }} ({{ res.step_name }}): {{ res.matched ? 'MATCH' : 'No Match' }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hidden Input to sync with Form -->
                <input type="hidden" name="steps" :value="stepsJson">
              </div>
            `,
            props: {
                initialSteps: {
                    type: Array,
                    default: function() { return []; }
                }
            },
            data: function() {
                var parsedSteps = this.initialSteps ? JSON.parse(JSON.stringify(this.initialSteps)) : [];

                // Migrate legacy step format to new conditions format
                parsedSteps.forEach(function(step) {
                    if (!step.conditions) {
                        step.conditions = [{
                            comparison: step.comparison || 'url',
                            operator: step.operator || 'contains',
                            pattern: step.pattern || '',
                            case_sensitive: step.case_sensitive || false,
                            ignore_query_params: step.ignore_query_params || false
                        }];
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
                    validationResults: []
                };
            },
            computed: {
                stepsJson: function() {
                    return JSON.stringify(this.steps);
                }
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
                        var item = this.steps.splice(index, 1)[0];
                        this.steps.splice(newIndex, 0, item);
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
                validate: function() {
                    var self = this;
                    var idSite = (new URLSearchParams(window.location.search)).get('idSite');
                    if (!idSite) {
                        alert('Cannot determine Site ID');
                        return;
                    }

                    var url = 'index.php?module=API&method=FunnelInsights.validateFunnelSteps&idSite=' + idSite + '&format=JSON';

                    var params = new URLSearchParams();
                    params.append('steps', JSON.stringify(this.steps));
                    params.append('testUrl', this.testValue);

                    fetch(url, {
                        method: 'POST',
                        body: params
                    })
                    .then(function(response) { return response.json(); })
                    .then(function(data) {
                        self.validationResults = data;
                    })
                    .catch(function(error) {
                        console.error('Validation failed:', error);
                        alert('Validation failed. See console.');
                    });
                }
            }
        };

        // Create and mount Vue 3 app
        var app = Vue.createApp({
            components: {
                'funnel-editor': FunnelEditorComponent
            }
        });

        app.mount(el);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFunnelEditor);
    } else {
        initFunnelEditor();
    }

})();
