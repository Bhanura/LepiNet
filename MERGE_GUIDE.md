# Step-by-Step Merge Guide: main → currentV

## Prerequisites

Before starting the merge process:

1. **Backup your work**
   ```bash
   git tag backup-main main
   git tag backup-currentV currentV
   ```

2. **Ensure clean working directory**
   ```bash
   git status
   # Should show "nothing to commit, working tree clean"
   ```

3. **Update local branches**
   ```bash
   git fetch --all
   ```

## Merge Approach: currentV as Base

Since currentV contains more advanced features and a newer architecture (Supabase), we'll merge main into currentV and keep currentV's changes for most conflicts.

### Step 1: Checkout currentV branch

```bash
git checkout currentV
```

### Step 2: Create a merge branch (recommended)

```bash
git checkout -b merge-main-into-currentV
```

### Step 3: Perform the merge

```bash
git merge --allow-unrelated-histories main
```

You will see conflicts in approximately 20 files.

### Step 4: Resolve Conflicts

For each conflicted file, you'll need to decide which version to keep. Here's the recommended approach:

#### Strategy Overview

**General Rule:** Keep currentV version for most files, as it has:
- Supabase authentication (more modern)
- Additional features
- Updated dependencies
- Better security practices

**Exception:** Review main for any bug fixes that should be incorporated.

#### Conflict Resolution by File Type

##### Configuration Files

1. **`.gitignore`**
   ```bash
   # Keep currentV version (has ".env" entry)
   git checkout --ours .gitignore
   ```

2. **`package.json`**
   ```bash
   # Keep currentV version (has updated dependencies)
   git checkout --ours package.json
   ```

3. **`package-lock.json`**
   ```bash
   # Keep currentV version (matches package.json)
   git checkout --ours package-lock.json
   ```

4. **`babel.config.js`**
   ```bash
   # Keep currentV version
   git checkout --ours babel.config.js
   ```

5. **`tailwind.config.js`**
   ```bash
   # Keep currentV version
   git checkout --ours tailwind.config.js
   ```

6. **`app.json`**
   ```bash
   # Keep currentV version
   git checkout --ours app.json
   ```

##### Application Files

7. **Authentication files**
   ```bash
   # Keep currentV versions (uses Supabase)
   git checkout --ours app/(auth)/sign-in.tsx
   git checkout --ours app/(auth)/sign-up.tsx
   git checkout --ours context/AuthContext.tsx
   ```

8. **Tab layout and screens**
   ```bash
   # Keep currentV versions (has new features)
   git checkout --ours app/(tabs)/_layout.tsx
   git checkout --ours app/(tabs)/index.tsx
   git checkout --ours app/(tabs)/explore.tsx
   git checkout --ours app/(tabs)/profile.tsx
   ```

9. **Root layout**
   ```bash
   # Keep currentV version
   git checkout --ours app/_layout.tsx
   ```

10. **New/Form related files**
    ```bash
    # Keep currentV versions (has enhanced functionality)
    git checkout --ours app/new/_layout.tsx
    git checkout --ours app/new/form.tsx
    git checkout --ours app/new/index.tsx
    ```

11. **Library files**
    ```bash
    # Keep currentV versions (uses Supabase and has enhancements)
    git checkout --ours lib/checklists.ts
    git checkout --ours lib/storage.ts
    ```

##### New Files in currentV (automatically kept)

These files exist only in currentV and will be kept automatically:
- `app/(tabs)/edit-profile.tsx`
- `app/checklist-view.tsx`
- `app/new/edit-record.tsx`
- `app/new/record-view.tsx`
- `lib/supabase.ts`

##### Deleted Files from main (should remain deleted)

These files should not be in the final merge:
- `lib/firebase.ts` (replaced by lib/supabase.ts)

### Step 5: Quick Resolution Script

For faster resolution, you can use this script:

```bash
# Resolve all conflicts by keeping currentV version (ours)
git checkout --ours .gitignore
git checkout --ours app.json
git checkout --ours app/(auth)/sign-in.tsx
git checkout --ours app/(auth)/sign-up.tsx
git checkout --ours app/(tabs)/_layout.tsx
git checkout --ours app/(tabs)/explore.tsx
git checkout --ours app/(tabs)/index.tsx
git checkout --ours app/(tabs)/profile.tsx
git checkout --ours app/_layout.tsx
git checkout --ours app/new/_layout.tsx
git checkout --ours app/new/form.tsx
git checkout --ours app/new/index.tsx
git checkout --ours babel.config.js
git checkout --ours context/AuthContext.tsx
git checkout --ours lib/checklists.ts
git checkout --ours lib/storage.ts
git checkout --ours package-lock.json
git checkout --ours package.json
git checkout --ours tailwind.config.js

# Stage all resolved files
git add .
```

### Step 6: Verify Resolution

```bash
# Check that all conflicts are resolved
git status

# Should show:
# All conflicts fixed but you are still merging.
```

### Step 7: Check the Merge

Before committing, review the changes:

```bash
# See what will be committed
git diff --cached

# List all files
git diff --cached --name-only
```

### Step 8: Complete the Merge

```bash
git commit -m "Merge main into currentV - Keep currentV implementation

- Kept currentV's Supabase authentication system
- Retained all new features (edit-profile, record management, checklist)
- Updated dependencies from currentV
- Removed Firebase implementation in favor of Supabase
- All conflicts resolved in favor of currentV as it represents the more advanced state"
```

### Step 9: Test the Merged Code

Before pushing, ensure the application works:

```bash
# Install dependencies
npm install

# Start the application
npx expo start
```

Test critical functionality:
- [ ] Authentication (sign in/sign up)
- [ ] Profile viewing and editing
- [ ] Checklist functionality
- [ ] Record creation and viewing
- [ ] Explore features

### Step 10: Push to Remote

If everything works:

```bash
# Push the merge branch
git push origin merge-main-into-currentV

# Or if you want to update currentV directly:
git checkout currentV
git merge merge-main-into-currentV
git push origin currentV
```

## Alternative: Manual Conflict Resolution

If you prefer to manually review each conflict:

1. **Open each conflicted file in your editor**
2. **Look for conflict markers:**
   ```
   <<<<<<< HEAD (currentV)
   [currentV's version]
   =======
   [main's version]
   >>>>>>> main
   ```
3. **Choose which version to keep** or combine them
4. **Remove conflict markers**
5. **Stage the file:** `git add <filename>`
6. **Repeat for all files**
7. **Commit the merge**

## Rollback if Needed

If something goes wrong:

```bash
# Abort the merge (if not yet committed)
git merge --abort

# Or reset to before merge (if already committed)
git reset --hard backup-currentV
```

## Post-Merge Tasks

After successful merge:

1. **Update documentation**
   - Update README.md with Supabase setup instructions
   - Document environment variables needed
   - Update any API documentation

2. **Create a release tag**
   ```bash
   git tag -a v2.0.0 -m "Merged main into currentV - Supabase migration"
   git push origin v2.0.0
   ```

3. **Update default branch** (if needed)
   - Go to GitHub repository settings
   - Change default branch to currentV or your merged branch

4. **Archive old branch** (optional)
   ```bash
   # Keep as archive
   git tag archive-main main
   git push origin archive-main
   
   # Delete remote branch (if obsolete)
   # git push origin --delete main
   ```

5. **Notify team members**
   - Inform team about the merge
   - Share updated setup instructions
   - Note breaking changes (Firebase → Supabase)

## Troubleshooting

### Issue: "refusing to merge unrelated histories"
**Solution:** Use `--allow-unrelated-histories` flag

### Issue: Too many conflicts
**Solution:** Use the quick resolution script provided in Step 5

### Issue: Application won't start after merge
**Solution:** 
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Run `npx expo start --clear`

### Issue: Authentication not working
**Solution:**
1. Ensure `.env` file has Supabase credentials
2. Check `lib/supabase.ts` configuration
3. Verify Expo SecureStore is properly installed

## Summary

This merge process will:
- ✅ Keep all currentV features and improvements
- ✅ Maintain Supabase authentication
- ✅ Preserve new components (edit-profile, record management)
- ✅ Use updated dependencies
- ✅ Remove obsolete Firebase code
- ✅ Create a unified codebase

The resulting branch will represent the most advanced state of your application with all modern features and architecture.
