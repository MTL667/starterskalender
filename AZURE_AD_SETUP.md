# Azure AD / Entra ID Setup Guide

Deze applicatie gebruikt **Azure AD (Microsoft Entra ID)** voor authenticatie met **multi-tenant support** en **strikte RBAC**.

## 📋 Overzicht

- **Multi-tenant**: Gebruikers van verschillende organisaties kunnen inloggen
- **Tenant Allowlist**: Alleen goedgekeurde tenant IDs krijgen toegang
- **Guest Users**: Nieuwe gebruikers krijgen automatisch `role = NONE` (geen toegang)
- **Admin Approval**: Een HR Admin moet rechten toekennen voordat gebruikers de app kunnen gebruiken

---

## 🔧 Azure AD App Registration

### Stap 1: Maak App Registration aan

1. Ga naar [Azure Portal](https://portal.azure.com)
2. Navigeer naar **Azure Active Directory** → **App registrations**
3. Klik **New registration**
4. Configureer:
   - **Name**: `Starterskalender`
   - **Supported account types**: **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
   - **Redirect URI**: 
     - Type: **Web**
     - URI: `https://your-domain.com/api/auth/callback/azure-ad`
     - (Voor development: `http://localhost:3000/api/auth/callback/azure-ad`)

### Stap 2: Client ID en Secret

1. Na aanmaken, kopieer de **Application (client) ID**
2. Ga naar **Certificates & secrets** → **New client secret**
3. Voeg beschrijving toe (bijv. "Production Key") en kies expiry
4. Kopieer de **secret value** (deze is maar 1x zichtbaar!)

### Stap 3: API Permissions

1. Ga naar **API permissions**
2. Klik **Add a permission** → **Microsoft Graph**
3. Selecteer **Delegated permissions**:
   - `openid`
   - `profile`
   - `email`
   - `offline_access`
4. Klik **Add permissions**
5. (Optioneel) Klik **Grant admin consent** als je admin bent

### Stap 4: Authentication Settings

1. Ga naar **Authentication**
2. Onder **Implicit grant and hybrid flows**: 
   - ✅ **ID tokens** (aanvinken)
3. Onder **Advanced settings**:
   - **Allow public client flows**: `No`
4. Save

---

## 🔐 Environment Variables

Voeg de volgende variabelen toe aan je **Easypanel** of **.env** bestand:

```bash
# Azure AD Configuration
AZURE_AD_CLIENT_ID="your-application-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret-value"

# Tenant Allowlist (comma-separated)
# Laat leeg om alle tenants toe te staan (NIET AANBEVOLEN!)
ALLOWED_TENANT_IDS="tenant-id-1,tenant-id-2"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# SendGrid (voor email notificaties)
SENDGRID_API_KEY="SG.your-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
```

### Tenant ID vinden

1. Ga naar [Azure Portal](https://portal.azure.com)
2. Navigeer naar **Azure Active Directory** → **Overview**
3. Kopieer de **Tenant ID**
4. Voeg toe aan `ALLOWED_TENANT_IDS` (comma-separated voor meerdere tenants)

**Voorbeeld**:
```bash
ALLOWED_TENANT_IDS="12345678-1234-1234-1234-123456789abc,87654321-4321-4321-4321-cba987654321"
```

---

## 🚀 Database Migratie

Na het updaten van de code, run de database migratie:

```bash
# In Easypanel App Terminal of lokaal:
npx prisma db push
```

Dit voegt de volgende velden toe aan de `User` tabel:
- `tenantId` (Azure AD Tenant ID)
- `oid` (Azure AD Object ID)
- `role` enum krijgt `NONE` als optie
- `password` wordt optional (voor backwards compatibility)

---

## 🔄 Workflow

### 1️⃣ **Nieuwe gebruiker logt in**

```
User → Azure AD Login → Token ontvangen → App checks:
  ├─ Is tenantId in allowlist? ❌ → Deny access
  └─ Is tenantId in allowlist? ✅ → Continue
      ├─ User bestaat niet? → Create User (role=NONE, no memberships)
      └─ User bestaat? → Update Azure AD fields
```

### 2️⃣ **Guest user ziet "Welcome" scherm**

- Middleware blokkeert `role=NONE` van alle routes
- Redirect naar `/auth/welcome`
- Boodschap: "Wacht op goedkeuring door beheerder"

### 3️⃣ **Admin kent rechten toe**

1. Admin gaat naar `/admin/users`
2. Ziet nieuwe gebruikers met **role=NONE**
3. Wijzigt role naar:
   - `HR_ADMIN`: Volledige toegang
   - `GLOBAL_VIEWER`: Kan alle data zien (read-only)
   - `ENTITY_VIEWER`: Kan alleen toegewezen entiteiten zien
   - `ENTITY_EDITOR`: Kan toegewezen entiteiten bewerken
4. (Optioneel) Kent entity memberships toe via "Entiteiten" knop

### 4️⃣ **User heeft nu toegang**

- Bij volgende login krijgt user toegang tot de app
- Rechten worden afgedwongen door:
  - **Middleware**: Blokkeert NONE users
  - **Server guards**: `requireAuth()` blokkeert NONE
  - **Entity guards**: `hasEntityAccess()` controleert memberships

---

## 🛡️ Security Features

### ✅ **Multi-Tenant met Allowlist**
- Alleen goedgekeurde Azure AD tenants kunnen inloggen
- Voorkomt ongeautoriseerde toegang van externe organisaties

### ✅ **Guest Users (role=NONE)**
- Nieuwe gebruikers hebben standaard **geen toegang**
- Admin moet expliciet rechten toekennen
- Zero-trust approach

### ✅ **Server-Side Enforcement**
- Middleware blokkeert NONE users op alle routes
- API guards checken role + entity membership
- UI hiding + server validation

### ✅ **Granular Permissions**
- **HR_ADMIN**: Volledige toegang (admin panel, alle entiteiten)
- **GLOBAL_VIEWER**: Kan alle data zien, maar niet bewerken
- **ENTITY_EDITOR**: Kan alleen toegewezen entiteiten bewerken
- **ENTITY_VIEWER**: Kan alleen toegewezen entiteiten zien
- **NONE**: Geen toegang (wacht op approval)

### ✅ **Audit Trail**
- Alle logins worden gelogd in `AuditLog`
- Inclusief tenant ID en eerste login indicator

---

## 🧪 Testing

### Development Testing (zonder allowlist)

Als `ALLOWED_TENANT_IDS` **leeg** is in development, worden alle tenants toegelaten met een waarschuwing:

```
⚠️  ALLOWED_TENANT_IDS is niet geconfigureerd - alle tenants worden toegelaten in development!
```

### Production Testing

1. Configureer `ALLOWED_TENANT_IDS` met je tenant ID
2. Test login met user uit die tenant → ✅ Success
3. Test login met user uit andere tenant → ❌ "Toegang geweigerd"
4. Test nieuwe user → role=NONE → redirect naar `/auth/welcome`
5. Admin kent role toe → user kan inloggen en werken

---

## 📞 Troubleshooting

### "Tenant not in allowlist"

**Probleem**: User krijgt "Toegang geweigerd" melding

**Oplossing**: 
1. Check of de user's tenant ID in `ALLOWED_TENANT_IDS` staat
2. Tenant ID vinden: Azure Portal → Azure AD → Overview → Tenant ID
3. Voeg toe aan environment variable (comma-separated)

### "Your account is pending approval"

**Probleem**: User kan inloggen maar ziet welcome scherm

**Oplossing**:
1. Dit is normaal gedrag voor nieuwe users
2. Admin moet inloggen en naar `/admin/users` gaan
3. Zoek de user en wijzig role van `NONE` naar gewenste rol

### "AZURE_AD_CLIENT_ID is not defined"

**Probleem**: Environment variables niet correct geconfigureerd

**Oplossing**:
1. Check `.env` bestand of Easypanel environment variables
2. Verifieer dat alle vereiste variabelen zijn ingesteld
3. Restart de applicatie na wijzigingen

### Redirect URI mismatch

**Probleem**: Azure AD geeft error over redirect URI

**Oplossing**:
1. Ga naar Azure Portal → App Registration → Authentication
2. Verifieer dat de redirect URI exact overeenkomt:
   - Production: `https://your-domain.com/api/auth/callback/azure-ad`
   - Development: `http://localhost:3000/api/auth/callback/azure-ad`
3. Let op: geen trailing slash!

---

## 🔄 Migratie van Password Auth

Als je overschakelt van username/password naar Azure AD:

1. **Oude users blijven bestaan** in de database
2. Password veld wordt optional (`password?`)
3. Bij eerste Azure AD login worden `tenantId` en `oid` toegevoegd
4. Je kunt oude password auth volledig verwijderen of als fallback houden

**Aanbeveling**: Verwijder oude signin/register pages en API routes (al gedaan in deze update).

---

## 📚 Meer Informatie

- [Azure AD Documentation](https://learn.microsoft.com/en-us/azure/active-directory/)
- [NextAuth.js Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)

