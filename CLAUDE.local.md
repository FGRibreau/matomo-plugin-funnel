# FunnelInsights Plugin - Development Notes

## Testing in Production

The Matomo instance at `https://managed-natalia-matomo-prod.apps.france-nuage.fr/` is exposed through Pangolin (zero-trust proxy). Direct HTTP requests from outside the cluster will be intercepted by Pangolin authentication.

### Testing URLs via kubectl

Always use `kubectl exec` with `curl` to test Matomo URLs directly:

```bash
# Get the running Matomo pod
MATOMO_POD=$(kubectl get pods -n managed-natalia-matomo-prod -l app.kubernetes.io/name=matomo --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')

# Test a URL (unauthenticated)
kubectl exec -n managed-natalia-matomo-prod $MATOMO_POD -- curl -s 'http://localhost:8080/index.php?module=API&method=API.getMatomoVersion'

# Test bundled JavaScript
kubectl exec -n managed-natalia-matomo-prod $MATOMO_POD -- curl -s 'http://localhost:8080/index.php?module=Proxy&action=getNonCoreJs' | grep -o 'Vue\.component\|createApp'

# Clear Matomo cache
kubectl exec -n managed-natalia-matomo-prod $MATOMO_POD -- /bin/bash -c "rm -rf /opt/bitnami/matomo/tmp/cache/* /opt/bitnami/matomo/tmp/assets/* /opt/bitnami/matomo/tmp/templates_c/*"
```

### Deploying Plugin Updates

```bash
# Install/update plugin from GitHub tag
kubectl exec -n managed-natalia-matomo-prod $MATOMO_POD -- /bin/bash -c "
cd /opt/bitnami/matomo/plugins && \
rm -rf FunnelInsights && \
curl -sL 'https://github.com/FGRibreau/matomo-plugin-funnel/archive/refs/tags/vX.Y.Z.tar.gz' | tar xz && \
mv matomo-plugin-funnel-* FunnelInsights && \
echo 'Plugin installed' && \
cat FunnelInsights/plugin.json | grep version
"

# Clear cache after update
kubectl exec -n managed-natalia-matomo-prod $MATOMO_POD -- /bin/bash -c "rm -rf /opt/bitnami/matomo/tmp/cache/* /opt/bitnami/matomo/tmp/assets/* /opt/bitnami/matomo/tmp/templates_c/*"
```

## Vue 3 Compatibility (Matomo 5+)

Matomo 5+ uses Vue 3. The following Vue 2 APIs are NOT available:

| Vue 2 (DON'T USE) | Vue 3 (USE THIS) |
|-------------------|------------------|
| `Vue.component()` | `createApp()` with inline components |
| `new Vue({ el })` | `app.mount(el)` |
| `this.$set()` | Direct array methods (push, splice) |

See `tests/Unit/Vue3CompatibilityTest.php` for non-regression tests.

## Namespaces

| Environment | Namespace | URL |
|-------------|-----------|-----|
| Natalia Prod | `managed-natalia-matomo-prod` | `https://managed-natalia-matomo-prod.apps.france-nuage.fr/` |
