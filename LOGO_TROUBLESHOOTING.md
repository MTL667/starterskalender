# Logo Upload - Troubleshooting Guide

## ❌ Probleem: "Logo" alt-text wordt getoond in plaats van het werkelijke logo

### Symptomen
- In de navbar zie je de tekst "Logo" in plaats van een afbeelding
- In het branding admin panel zie je ook "Logo" in de preview
- De browser toont een "broken image" icoon

---

## 🔍 Oorzaken en Oplossingen

### 1️⃣ **Database Schema Niet Gepusht** (Meest Voorkomend)

#### Probleem:
De `SystemSettings` tabel bestaat nog niet in je database.

#### Oplossing:
```bash
# In Easypanel Terminal (van de APP service):
npx prisma db push
```

#### Verificatie:
- Ga naar `/admin/branding`
- Als je een error banner ziet met "SystemSettings table does not exist", dan is dit het probleem
- Na `prisma db push` refresh de pagina

---

### 2️⃣ **Geen Logo Geüpload**

#### Probleem:
Er is nog geen logo geüpload naar de database.

#### Oplossing:
1. Ga naar `/admin/branding`
2. Klik op **Selecteer** of sleep een bestand
3. Kies een PNG, JPG, SVG of WebP (max 2MB)
4. Wacht tot "Logo succesvol geüpload!" verschijnt
5. Refresh de pagina of navigeer naar een andere pagina

#### Verificatie:
- Check de browser console voor upload errors
- Kijk of je een groene success melding ziet

---

### 3️⃣ **Uploads Folder Bestaat Niet**

#### Probleem:
De `/public/uploads/` folder bestaat niet op de server.

#### Oplossing A (Automatisch):
De folder wordt automatisch aangemaakt bij de eerste upload.

#### Oplossing B (Handmatig):
```bash
# In Easypanel Terminal:
mkdir -p public/uploads
```

---

### 4️⃣ **File Path Incorrect**

#### Probleem:
Het geüploade bestand is niet toegankelijk via de gegenereerde URL.

#### Check:
```bash
# In Easypanel Terminal:
ls -la public/uploads/
```

Je zou bestanden moeten zien zoals:
```
logo-1730123456789.png
logo-1730123456790.svg
```

#### Oplossing:
Als de folder leeg is maar je hebt wel geüpload:
1. Check de browser console voor upload errors
2. Upload opnieuw
3. Check file permissions:
```bash
chmod 755 public/uploads
```

---

## 🔧 Debug Stappen

### Stap 1: Check Browser Console
1. Open Developer Tools (F12)
2. Ga naar **Console** tab
3. Refresh de pagina
4. Zoek naar errors zoals:
   - `Error loading logo: ...`
   - `API error: 500`
   - `Failed to fetch`

### Stap 2: Check Network Tab
1. Open Developer Tools (F12)
2. Ga naar **Network** tab
3. Refresh de pagina
4. Zoek naar:
   - `GET /api/system/settings` - Status moet 200 zijn
   - Response moet JSON zijn: `{"logo_url": "/uploads/logo-123.png"}` of `{}`

### Stap 3: Check Database
```bash
# In Easypanel Terminal:
npx prisma studio
```

1. Open de browser naar de gegeven URL
2. Ga naar `SystemSettings` tabel
3. Kijk of er een record bestaat met:
   - `key: "logo_url"`
   - `value: "/uploads/logo-123.png"`

### Stap 4: Test Upload
1. Ga naar `/admin/branding`
2. Open browser console
3. Upload een test bestand
4. Kijk naar console logs:
   - `Upload response: { logoUrl: "..." }`
   - Als je een error ziet, lees de error message

---

## ✅ Checklist

Werk deze checklist af om het probleem op te lossen:

- [ ] **Database schema gepusht**
  ```bash
  npx prisma db push
  ```

- [ ] **Prisma client gegenereerd**
  ```bash
  npx prisma generate
  ```

- [ ] **Applicatie restarted**
  - In Easypanel: klik "Restart" bij de app service

- [ ] **Logo geüpload**
  - Ga naar `/admin/branding`
  - Upload een test logo
  - Zie je een success melding?

- [ ] **Browser cache gecleared**
  - Hard refresh: `Ctrl+Shift+R` (Windows) of `Cmd+Shift+R` (Mac)

- [ ] **Uploads folder bestaat**
  ```bash
  ls -la public/uploads/
  ```

- [ ] **Logo URL correct in database**
  - Via `npx prisma studio`
  - Check `SystemSettings` tabel
  - `key: "logo_url"`, `value: "/uploads/logo-xxx.png"`

---

## 🚨 Veelvoorkomende Errors

### Error: "SystemSettings table does not exist"
**Oplossing:** Run `npx prisma db push`

### Error: "Invalid file type"
**Oplossing:** Upload alleen PNG, JPG, SVG, of WebP

### Error: "File too large"
**Oplossing:** Gebruik een bestand kleiner dan 2MB

### Error: "Failed to upload logo"
**Oplossing:** 
1. Check file permissions op server
2. Check of uploads folder bestaat
3. Check browser console voor details

### Error: "API error: 500"
**Oplossing:**
1. Check Easypanel logs (klik op "Logs" bij de app)
2. Zoek naar Prisma errors
3. Run `npx prisma db push` als je Prisma errors ziet

---

## 📞 Nog Steeds Problemen?

1. **Check Easypanel Logs:**
   - Klik op de app service
   - Klik op "Logs"
   - Zoek naar errors rond de tijd van upload

2. **Check Browser Console:**
   - F12 → Console tab
   - Refresh de pagina
   - Screenshot alle errors

3. **Check API Response:**
   ```bash
   # In terminal of Postman:
   curl https://jouw-domain.be/api/system/settings
   ```
   
   Verwachte response:
   ```json
   {"logo_url": "/uploads/logo-123.png"}
   ```
   
   Of als geen logo:
   ```json
   {}
   ```

4. **Manual Test Upload:**
   ```bash
   # In Easypanel Terminal:
   cd public/uploads
   touch test.txt
   ls -la
   ```
   
   Als je "Permission denied" ziet, is het een permissions probleem.

---

## 💡 Tips

- **SVG is het beste formaat** (schaalbaar, klein bestand)
- **Gebruik transparante achtergrond** voor beste resultaat
- **Aanbevolen hoogte: 40-50 pixels**
- **Test met een klein bestand eerst** (< 100KB)
- **Clear browser cache** na elke wijziging
- **Check in incognito mode** om cache issues uit te sluiten

