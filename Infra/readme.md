# CrownCo Infrastructure

This directory contains all infrastructure configuration files, deployment manifests, and environment-specific settings for the CrownCo CRM system.

## 📁 Directory Structure

```
Infra/
├── Azure/                          # Azure Kubernetes Service (AKS) configurations
│   ├── Production/                # Production environment YAML configs
│   ├── Stage/                     # Stage environment YAML configs
│   └── Creds/                     # Azure credentials and kubeconfigs
│       ├── kubeconfig/
│       │   ├── crownco-production-kubeconfig.yaml
│       │   └── crownco-stage-kubeconfig.yaml
│       └── registry.txt           # Azure Container Registry credentials
│
├── K3S/                           # K3S Kubernetes configurations
│   ├── Production/                # Production environment configs
│   ├── Stage/                     # Stage environment configs
│   └── Creds/                     # K3S credentials
│       ├── kubeconfig/
│       └── registry.txt
│
├── DomainMapping.config           # Domain and ingress service mappings
└── readme.md                      # This file
```

## 🎯 Overview

The infrastructure is organized into two main Kubernetes environments:

### 1. **Azure Kubernetes Service (AKS)**
- **Production**: Production workloads on Azure AKS
- **Stage**: Staging/testing environment on Azure AKS
- **Container Registry**: Azure Container Registry (ACR)

### 2. **K3S Kubernetes**
- **Production**: Production workloads on K3S cluster
- **Stage**: Staging/testing environment on K3S cluster
- **Container Registry**: Private container registry

## 📋 Configuration Files

### Azure Environments

#### Production (`Azure/Production/`)
Contains YAML configuration files for production deployment:
- **Deployment manifests**: Kubernetes deployment configurations
- **Service definitions**: Service and ingress configurations
- **ConfigMaps**: Application configuration
- **Secrets**: Environment-specific secrets (referenced, not stored)
- **Ingress rules**: Domain routing and SSL configurations

**File Structure** (YAML configs):
```
Azure/Production/
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-manager-deployment.yaml
├── frontend-manager-service.yaml
├── frontend-presales-deployment.yaml
├── frontend-presales-service.yaml
├── frontend-sales-deployment.yaml
├── frontend-sales-service.yaml
├── ingress.yaml
├── configmap.yaml
└── secrets.yaml (template)
```

#### Stage (`Azure/Stage/`)
Contains YAML configuration files for staging environment:
- Similar structure to Production
- Environment-specific configurations
- Lower resource allocations
- Test domain mappings

**File Structure** (YAML configs):
```
Azure/Stage/
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-manager-deployment.yaml
├── frontend-manager-service.yaml
├── frontend-presales-deployment.yaml
├── frontend-presales-service.yaml
├── frontend-sales-deployment.yaml
├── frontend-sales-service.yaml
├── ingress.yaml
├── configmap.yaml
└── secrets.yaml (template)
```

### K3S Environments

#### Production (`K3S/Production/`)
K3S production cluster configurations

#### Stage (`K3S/Stage/`)
K3S staging cluster configurations

## 🔐 Credentials & Access

### Azure Credentials

**Location**: `Azure/Creds/`

- **Kubeconfig Files**: 
  - `kubeconfig/crownco-production-kubeconfig.yaml` - Production cluster access
  - `kubeconfig/crownco-stage-kubeconfig.yaml` - Stage cluster access

- **Container Registry**: `registry.txt`
  - Registry name, login server, username, and passwords
  - **Note**: Always build Linux AMD64 images
  - Use incremental image tags (e.g., 1.0.1, 1.0.2, 1.0.11) - **NOT** `latest`

### K3S Credentials

**Location**: `K3S/Creds/`

- Kubeconfig files for K3S cluster access
- Container registry credentials

**⚠️ Security Note**: 
- Credentials are stored locally and should **NOT** be committed to version control
- Use secret management tools (e.g., Kubernetes Secrets, Azure Key Vault)
- Rotate credentials regularly

## 🌐 Domain Mapping

**File**: `DomainMapping.config`

This file contains ingress service configurations for:
- **Production Environment**: API and UI domain mappings
- **Stage Environment**: API and UI domain mappings  
- **K3S Environment**: API and UI domain mappings

### Example Structure:
```yaml
Production:
  APIs:
    - api.crownco.com
    - api-v2.crownco.com
  UIs:
    - manager.crownco.com
    - presales.crownco.com
    - sales.crownco.com

Stage:
  APIs:
    - api-stage.crownco.com
  UIs:
    - manager-stage.crownco.com
    - presales-stage.crownco.com
```

## 🚀 Deployment Workflow

### Prerequisites
1. **kubectl** installed and configured
2. **Docker** installed for image building
3. **Azure CLI** (for AKS deployments)
4. Appropriate kubeconfig file loaded

### Deployment Steps

#### 1. Build and Push Docker Images

```bash
# Build for Linux AMD64 (required for Azure)
docker buildx build --platform linux/amd64 -t truelink.azurecr.io/crownco-backend:1.0.1 .

# Login to registry
docker login truelink.azurecr.io -u truelink -p <password>

# Push image
docker push truelink.azurecr.io/crownco-backend:1.0.1
```

**Important**: 
- Always use `--platform linux/amd64` for Azure deployments
- Use incremental version tags (1.0.1, 1.0.2, etc.)
- Never use `latest` tag

#### 2. Configure kubectl Context

```bash
# For Azure Production
export KUBECONFIG=Azure/Creds/kubeconfig/crownco-production-kubeconfig.yaml

# For Azure Stage
export KUBECONFIG=Azure/Creds/kubeconfig/crownco-stage-kubeconfig.yaml
```

#### 3. Apply Configurations

```bash
# Deploy to Production
kubectl apply -f Azure/Production/

# Deploy to Stage
kubectl apply -f Azure/Stage/

# Or deploy specific service
kubectl apply -f Azure/Production/backend-deployment.yaml
kubectl apply -f Azure/Production/backend-service.yaml
```

#### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n <namespace>

# Check services
kubectl get services -n <namespace>

# Check ingress
kubectl get ingress -n <namespace>

# View logs
kubectl logs -f <pod-name> -n <namespace>
```

## 📦 Application Services

### Backend Services
- **API Services**: RESTful APIs for CRM operations
- **Database**: PostgreSQL (managed service or containerized)
- **Background Jobs**: Async task processing

### Frontend Services
- **Manager Frontend**: Manager dashboard and analytics
- **Pre-to-Sales Frontend**: Unified Pre-to-Sales interface
- **Presales Frontend**: Presales team interface
- **Sales Frontend**: Sales team interface

## 🔧 Configuration Management

### Environment Variables

Environment-specific configurations are managed through:
- **ConfigMaps**: Non-sensitive configuration data
- **Secrets**: Sensitive data (passwords, API keys, tokens)

### Example ConfigMap Structure:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crownco-backend-config
  namespace: production
data:
  DATABASE_URL: "postgresql://..."
  REDIS_URL: "redis://..."
  ENVIRONMENT: "production"
```

### Example Secret Structure:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crownco-backend-secrets
  namespace: production
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded>
  API_KEY: <base64-encoded>
```

## 🌍 Ingress & Routing

### Ingress Configuration

Ingress rules are defined in `ingress.yaml` files and handle:
- Domain routing
- SSL/TLS termination
- Path-based routing
- Load balancing

### Domain Mapping

See `DomainMapping.config` for complete domain mappings:
- Production domains
- Stage domains
- API endpoints
- UI endpoints

## 📊 Monitoring & Logging

### Recommended Tools
- **Kubernetes Dashboard**: Cluster overview
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **ELK Stack**: Log aggregation and analysis

### Health Checks
- Liveness probes: Container health
- Readiness probes: Service availability
- Startup probes: Initial startup validation

## 🔄 CI/CD Integration

### Recommended Pipeline

1. **Build**: Docker image build with version tag
2. **Test**: Run automated tests
3. **Push**: Push to container registry
4. **Deploy**: Apply Kubernetes manifests
5. **Verify**: Health check and smoke tests
6. **Rollback**: Automatic rollback on failure

### Version Tagging Strategy
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Examples: `1.0.1`, `1.0.2`, `1.1.0`, `2.0.0`
- Never use `latest` tag in production

## 🛡️ Security Best Practices

1. **Secrets Management**
   - Never commit secrets to version control
   - Use Kubernetes Secrets or external secret managers
   - Rotate credentials regularly

2. **Image Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Keep images updated

3. **Network Security**
   - Use network policies
   - Restrict ingress/egress
   - Enable TLS/SSL everywhere

4. **Access Control**
   - Use RBAC (Role-Based Access Control)
   - Limit cluster access
   - Audit access logs

## 📝 Maintenance

### Regular Tasks
- Update Kubernetes manifests
- Rotate credentials
- Monitor resource usage
- Review and update security policies
- Backup configurations

### Troubleshooting

```bash
# Check pod status
kubectl describe pod <pod-name> -n <namespace>

# View events
kubectl get events -n <namespace>

# Check resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# Debug container
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
```

## 🔗 Related Documentation

- [Backend Services](../Backend/API_SERVICES_SUMMARY.md)
- [Database Schema](../Backend/Database/README.md)
- [Frontend Applications](../Frontend/README.md)

## 📌 Notes

- **Platform Compatibility**: Always build images for `linux/amd64` platform for Azure deployments
- **Image Tags**: Use incremental version tags, never use `latest`
- **Credentials**: Keep credentials secure and never commit to version control
- **Multi-Platform**: When publishing images to Docker, ensure both Mac and AMD/Linux platforms are supported (as per project requirements)

---

**Last Updated**: [Current Date]  
**Kubernetes Versions**: AKS (varies), K3S (varies)  
**Container Registry**: Azure Container Registry (ACR)  
**Status**: Active Maintenance