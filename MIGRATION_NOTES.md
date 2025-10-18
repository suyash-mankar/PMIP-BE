# Database Migration Notes - Razorpay Integration

## Overview

This migration updates the Payment model to work with Razorpay instead of Stripe.

## Changes to Payment Model

### Fields Renamed:

- `stripeSessionId` → `razorpaySubscriptionId`
- `stripeCustomerId` → `razorpayCustomerId`

### Fields Added:

- `razorpayPaymentId` - Individual payment ID for each charge

### Fields Updated:

- `currency` - Now supports both 'usd' and 'inr'
- `status` - Added 'cancelled' as a valid status
- `subscriptionType` - Changed from 'basic'/'premium' to 'free'/'pro'

## Migration Command

```bash
# Navigate to backend directory
cd PMIP-BE

# Run migration (this will create and apply the migration)
npx prisma migrate dev --name update_payment_for_razorpay

# Alternative: If you want to just update schema without migration
npx prisma db push
```

## What the Migration Does

1. **Renames columns** in the Payment table
2. **Adds new columns** for Razorpay payment tracking
3. **Updates indexes** to use new column names
4. **Preserves existing data** (if any)

## Post-Migration Steps

1. **Update existing records** (if you have any test data):

```sql
-- Update subscription type from old values to new
UPDATE "Payment"
SET "subscriptionType" = 'pro'
WHERE "subscriptionType" IN ('basic', 'premium');
```

2. **Verify schema**:

```bash
npx prisma studio
# Check that Payment table has the new fields
```

3. **Test the API**:

```bash
# Start the backend
npm run dev

# Make a test API call
curl http://localhost:4000/api/payment/subscription-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Rollback (if needed)

If you need to rollback this migration:

```bash
# Revert to previous migration
npx prisma migrate resolve --rolled-back update_payment_for_razorpay

# Restore previous schema
git checkout HEAD~1 -- prisma/schema.prisma

# Apply previous schema
npx prisma migrate dev
```

## Notes

- This is a **breaking change** - old Stripe data won't work with new code
- If you have production Stripe data, you'll need a data migration script
- Test thoroughly in development before deploying to production
- Make a backup of production database before migrating

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Payment table has new Razorpay fields
- [ ] Indexes created on razorpaySubscriptionId
- [ ] Backend starts without errors
- [ ] Can create new subscriptions
- [ ] Webhooks update payment records correctly
