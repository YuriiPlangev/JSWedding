# Contractor Management Setup Guide

This guide explains how to set up the contractor management feature for events.

## Overview

The contractor feature allows organizers to create a shared contractor account for each event. All contractors working on the event use the same login credentials and can access:
- Event details (date, venue, guest count, couple names)
- Dress code
- Organizer and coordinator contacts
- Shared documents (timing plans, layouts, etc.)

**Architecture:**
- **1 Event = 1 Contractor Account** (shared by all contractors)
- Organizers manage contractor settings and documents via OrganizerDashboard
- Contractors access their dashboard with read-only view

---

## Database Setup

### Step 0: Prerequisites

Make sure you have already run the contractor role migration:
- **File:** `supabase/add_contractor_role.sql`
- This adds `'contractor'` to the allowed roles in the `profiles` table

If you haven't run it yet, execute it first:

```sql
-- In Supabase SQL Editor
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'organizer', 'main_organizer', 'contractor'));
```

### Step 1: Add Contractor Fields to Weddings Table

**File:** `supabase/add_contractor_fields_to_weddings.sql`

This migration adds contractor-related columns to the `weddings` table:
- `contractor_user_id` - Links to the shared contractor account
- `contractor_dress_code` - Dress code information
- `contractor_organizer_contacts` - Organizer contact details
- `contractor_coordinator_contacts` - Coordinator contact details

**To execute:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/add_contractor_fields_to_weddings.sql`
3. Execute the SQL
4. Verify: Check `weddings` table schema to confirm new columns exist

### Step 2: Create Contractor Documents Table

**File:** `supabase/create_contractor_documents_table.sql`

This creates a new table `contractor_documents` for storing documents accessible to contractors.

**Table structure:**
- `id` (UUID, Primary Key)
- `wedding_id` (UUID, Foreign Key → weddings.id)
- `name`, `name_en`, `name_ru`, `name_ua` (TEXT) - Multi-language document names
- `link` (TEXT, required) - URL to document (Google Drive, Dropbox, etc.)
- `created_at`, `updated_at` (Timestamps)

**Row Level Security (RLS):**
- Organizers can manage documents for their events
- Main organizers can manage all documents
- Contractors can read documents for their assigned event

**To execute:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/create_contractor_documents_table.sql`
3. Execute the SQL
4. Verify: Check that `contractor_documents` table exists

---

## Usage Guide

### For Organizers

#### Step 1: Open Event in OrganizerDashboard

Navigate to the event you want to configure contractors for.

#### Step 2: Open Contractor Management

Click the **"Manage Contractors"** button (or similar - UI pending implementation).

#### Step 3: Create Contractor Account

In the modal:
1. **Account Tab:**
   - Enter email (e.g., `contractors@konstantin-diana-wedding.com`)
   - Enter password (shared with all contractors)
   - Click "Next"

2. **Settings Tab:**
   - Enter dress code information
   - Enter organizer contacts (phone, email, telegram)
   - Enter coordinator contacts
   - Click "Next"

3. **Documents Tab:**
   - Add documents by providing:
     - Name in EN/RU/UA
     - Link (Google Docs, Drive, etc.)
   - Click "Add" for each document
   - Click "Finish" when done

#### Step 4: Share Credentials

Give the email and password to all contractors working on the event.

### For Contractors

1. Navigate to login page
2. Enter shared email and password
3. Access ContractorDashboard with:
   - Event details
   - Dress code
   - Contacts
   - Documents (view/download only)

---

## API Methods (contractorService)

### Account Management

```typescript
// Create new contractor account
contractorService.createContractorAccount(email, password)
  → { userId, error }

// Link contractor to event
contractorService.linkContractorToEvent(weddingId, contractorUserId, settings)
  → { success, error }

// Update contractor settings
contractorService.updateContractorSettings(weddingId, settings)
  → { success, error }

// Remove contractor from event
contractorService.removeContractorFromEvent(weddingId)
  → { success, error }
```

### Document Management

```typescript
// Get contractor documents
contractorService.getContractorDocuments(weddingId)
  → { documents, error }

// Add contractor document
contractorService.addContractorDocument(weddingId, document)
  → { document, error }

// Update contractor document
contractorService.updateContractorDocument(documentId, updates)
  → { success, error }

// Delete contractor document
contractorService.deleteContractorDocument(documentId)
  → { success, error }
```

### Contractor Dashboard

```typescript
// Get wedding data for current contractor
contractorService.getContractorWedding(contractorUserId)
  → { wedding, error }
```

---

## Security Considerations

- **RLS Policies** ensure contractors can only access their assigned event
- **Shared credentials** mean all contractors see the same data (by design)
- **Read-only access** for contractors (they cannot modify event data)
- Organizers retain full control over contractor settings and documents

---

## Troubleshooting

### Error: "role must be client, organizer, or main_organizer"
**Solution:** Run `supabase/add_contractor_role.sql` migration first.

### Error: "column contractor_user_id does not exist"
**Solution:** Run `supabase/add_contractor_fields_to_weddings.sql` migration.

### Error: "relation contractor_documents does not exist"
**Solution:** Run `supabase/create_contractor_documents_table.sql` migration.

### Contractor can't see documents
**Solution:** 
1. Check that documents were added via `contractor_documents` table (not regular `documents`)
2. Verify `wedding.contractor_user_id` matches the contractor's user ID
3. Check RLS policies are enabled and correct

---

## Next Steps

- [ ] Complete OrganizerDashboard integration (UI for managing contractors)
- [ ] Update ContractorDashboard to fetch real data instead of mocks
- [ ] Add ability to edit contractor account credentials
- [ ] Add contractor activity logging
- [ ] Add email notifications when contractor account is created
