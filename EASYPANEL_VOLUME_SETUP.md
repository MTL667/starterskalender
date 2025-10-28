# Easypanel Volume Setup voor Logo Uploads

## 🎯 Doel
Zorg dat geüploade logo's persistent blijven na app restarts.

---

## 📋 **Methode 1: Via Easypanel UI (Simpelst)**

### Stappen:

1. **Open Easypanel Dashboard**
   - Ga naar je project (bijv. `p1`)
   - Klik op de `starterskalender` app service

2. **Ga naar Mounts/Volumes Sectie**
   - Klik op **"Settings"** tab
   - Scroll naar **"Mounts"** of **"Volumes"**
   - Klik **"Add Mount"** of **"+"**

3. **Configureer Volume**
   ```
   Container Path: /app/public/uploads
   Volume Name:    starterskalender-uploads
   Mount Type:     Volume
   Read Only:      false (niet aangevinkt)
   ```

4. **Save & Deploy**
   - Klik **"Save"**
   - App restart automatisch
   - ✅ Volume is nu actief!

---

## 📋 **Methode 2: Via Easypanel Settings (JSON)**

Als Easypanel een JSON configuratie gebruikt:

1. Ga naar **"Settings"** → **"Advanced"**
2. Zoek naar **"volumes"** of **"mounts"** sectie
3. Voeg toe:

```json
{
  "volumes": [
    {
      "name": "uploads",
      "mountPath": "/app/public/uploads"
    }
  ]
}
```

---

## 📋 **Methode 3: Via Terminal (Temporary Test)**

Om **direct** te testen (werkt tot restart):

```bash
# In Easypanel App Terminal:
mkdir -p /app/public/uploads
chown -R nextjs:nodejs /app/public/uploads
chmod 755 /app/public/uploads
ls -la /app/public/
```

**Upload nu een logo** via `/admin/branding` en check of het werkt!

---

## ✅ **Verificatie**

### Test 1: Check of Folder Bestaat
```bash
ls -la /app/public/uploads/
```

Moet tonen:
```
drwxr-xr-x 2 nextjs nodejs 4096 Jan 1 12:00 .
```

### Test 2: Schrijf Test File
```bash
cd /app/public/uploads
echo "Volume test $(date)" > test.txt
cat test.txt
```

### Test 3: Restart & Check Persistence
```bash
# Restart app in Easypanel UI
# Dan in nieuwe terminal:
cat /app/public/uploads/test.txt
```

**Als test.txt er nog is → Volume werkt! ✅**

### Test 4: Upload Logo
1. Ga naar `/admin/branding`
2. Upload een logo (PNG/SVG/JPG)
3. Check navbar → logo moet verschijnen
4. Check terminal:
```bash
ls -la /app/public/uploads/
# Moet logo-xxxxx.png tonen
```

---

## 🔧 **Troubleshooting**

### Probleem: "Permission Denied" bij Upload

**Oplossing:**
```bash
chown -R nextjs:nodejs /app/public/uploads
chmod 755 /app/public/uploads
```

### Probleem: Volume Mount Niet Zichtbaar in UI

Easypanel versies verschillen. Probeer:
1. **Settings** → **Advanced** → **Volumes**
2. **Settings** → **Storage**
3. **Settings** → **Mounts**
4. **Edit Service** → **Volumes Tab**

### Probleem: Files Verdwijnen Na Restart

**Oorzaak:** Volume niet correct gemount.

**Check:**
```bash
# In terminal:
df -h | grep uploads
mount | grep uploads
```

Moet zoiets tonen:
```
/dev/xxx on /app/public/uploads type ext4 (rw,relatime)
```

Als je **niets** ziet → volume is niet gemount → ga terug naar Methode 1.

---

## 📸 **Screenshot Voorbeeld**

Easypanel Mount Configuration:

```
┌────────────────────────────────────────────┐
│ Add Volume Mount                           │
├────────────────────────────────────────────┤
│                                            │
│ Container Path*                            │
│ /app/public/uploads                        │
│                                            │
│ Volume*                                    │
│ [Select existing] ▼  or  [Create new]     │
│ starterskalender-uploads                   │
│                                            │
│ Read Only                                  │
│ ☐ Enable read-only mode                   │
│                                            │
│         [Cancel]         [Save & Deploy]   │
└────────────────────────────────────────────┘
```

---

## 🚀 **Wat Nu?**

Na het configureren:

1. ✅ **Push de nieuwe Dockerfile**
   ```bash
   git add Dockerfile
   git commit -m "Add uploads folder with permissions"
   git push
   ```

2. ✅ **Deploy in Easypanel**
   - Easypanel detecteert automatisch de nieuwe Dockerfile
   - Rebuilds de image
   - Start met volume mount

3. ✅ **Test Logo Upload**
   - Ga naar `/admin/branding`
   - Upload een logo
   - Check navbar
   - Restart app → logo blijft staan! 🎉

---

## 💡 **Tips**

- **Backup uploads** via Easypanel's volume backup feature
- **Monitor disk usage** in Easypanel dashboard
- **Logo's zijn klein** (< 2MB) dus disk space is geen probleem
- **Volume is gedeeld** tussen alle replicas van je app

---

## ❓ **Nog Vragen?**

Check:
- Easypanel docs: https://easypanel.io/docs/volumes
- Of vraag in Easypanel support chat

