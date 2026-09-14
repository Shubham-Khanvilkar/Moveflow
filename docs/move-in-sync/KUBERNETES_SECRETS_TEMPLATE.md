# Kubernetes Secrets Template

Do not commit a populated Secret manifest. Create the secret in each target namespace using an approved secret manager or a controlled command:

```bash
kubectl create secret generic moveflow-secrets \
  --namespace production \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...' \
  --from-literal=jwt-secret='...' \
  --from-literal=postgres-user='...' \
  --from-literal=postgres-password='...'
```

Required keys are defined by `k8s/api-gateway.yaml` and `k8s/infrastructure.yaml`. Store actual values in the deployment platform secret manager, not in this repository.
