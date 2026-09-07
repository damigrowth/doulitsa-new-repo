# PR #490 — "Changes" (branch `changes`) — Full Change Log

**Merge commit:** `10c2d89f` — Merge pull request #490 from damigrowth/changes
**Commits inside the PR:**
1. `eeb52510` — *Text changes and Hide Coupon* (Aug 12, 2026)
2. `b277c800` — *Service card style* (Aug 12, 2026)

**Purpose of this document:** exact, file-by-file record of every change so the same changes can be replicated in another app. Each section states the file, the location inside the file, the intent, and the exact BEFORE and AFTER code.

**Totals:** 9 files changed, 147 insertions(+), 170 deletions(-)

| File | Change type |
|---|---|
| `src/app/(dashboard)/dashboard/checkout/checkout-content.tsx` | Hide coupon input behind a feature flag |
| `src/components/messages/start-chat-dialog.tsx` | Text change (dialog title) |
| `src/components/review/review-form.tsx` | Style change (like/unlike buttons) |
| `src/components/shared/auth-required-dialog.tsx` | Comment/doc text change |
| `src/constants/datasets/about.ts` | FAQ answer text change |
| `src/constants/datasets/for-pros.ts` | 3 benefit descriptions text changes |
| `src/components/archives/archive-service-card.tsx` | Full layout redesign of the archive service card |
| `src/components/shared/service-card.tsx` | Card border/shadow style change |
| `src/components/shared/service-media-card.tsx` | Card border/shadow style change |

---

# Commit 1: `eeb52510` — Text changes and Hide Coupon

## 1.1 `src/app/(dashboard)/dashboard/checkout/checkout-content.tsx`

**Intent:** Temporarily hide the coupon input on the checkout page WITHOUT deleting any of its logic. All state, handlers, and JSX stay in the file; only rendering is gated behind a module-level boolean flag so it can be re-enabled by flipping one constant.

### Change A — add the feature flag (module scope, right after the `CheckoutContentProps` interface, before the `CheckoutContent` component definition)

```tsx
interface CheckoutContentProps {
  ...
  defaultInterval: BillingInterval;
}

// Coupon input is temporarily hidden from checkout (kept fully functional in code
// so it can be re-enabled later just by flipping this flag back to true).
const COUPON_INPUT_VISIBLE = false;

export default function CheckoutContent({
  user,
  profile,
  ...
```

### Change B — wrap the entire Coupon Input JSX block in `{COUPON_INPUT_VISIBLE && ( ... )}`

Located in the render, between the order-summary block and the Checkout `<Button>` (was around line 1273). Nothing inside the block was deleted — it was only wrapped (and re-indented one level).

**BEFORE:**
```tsx
            {/* Coupon Input */}
            <div className='space-y-2'>
              {couponState.status === 'valid' ? (
                <div className='flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2'>
                  <div className='flex items-center gap-2 text-sm text-green-700'>
                    <Tag className='size-4' />
                    <span className='font-medium'>{couponState.code}</span>
                    <span>(-{couponState.percentOff}%)</span>
                  </div>
                  <button
                    type='button'
                    onClick={handleRemoveCoupon}
                    className='text-green-600 hover:text-green-800'
                  >
                    <X className='size-4' />
                  </button>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <Input
                    placeholder='Κωδικός κουπονιού'
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      if (couponState.status === 'error') {
                        setCouponState({ status: 'idle' });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    className='flex-1'
                  />
                  <Button
                    variant='outline'
                    size='default'
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    {couponLoading ? (
                      <Loader2 className='size-4 animate-spin' />
                    ) : (
                      'Εφαρμογή'
                    )}
                  </Button>
                </div>
              )}
              {couponState.status === 'error' && couponState.message && (
                <p className='text-xs text-red-600'>{couponState.message}</p>
              )}
            </div>
```

**AFTER:**
```tsx
            {/* Coupon Input - hidden for now, see COUPON_INPUT_VISIBLE above */}
            {COUPON_INPUT_VISIBLE && (
              <div className='space-y-2'>
                {couponState.status === 'valid' ? (
                  <div className='flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2'>
                    <div className='flex items-center gap-2 text-sm text-green-700'>
                      <Tag className='size-4' />
                      <span className='font-medium'>{couponState.code}</span>
                      <span>(-{couponState.percentOff}%)</span>
                    </div>
                    <button
                      type='button'
                      onClick={handleRemoveCoupon}
                      className='text-green-600 hover:text-green-800'
                    >
                      <X className='size-4' />
                    </button>
                  </div>
                ) : (
                  <div className='flex gap-2'>
                    <Input
                      placeholder='Κωδικός κουπονιού'
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponState.status === 'error') {
                          setCouponState({ status: 'idle' });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className='flex-1'
                    />
                    <Button
                      variant='outline'
                      size='default'
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                    >
                      {couponLoading ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        'Εφαρμογή'
                      )}
                    </Button>
                  </div>
                )}
                {couponState.status === 'error' && couponState.message && (
                  <p className='text-xs text-red-600'>{couponState.message}</p>
                )}
              </div>
            )}
```

---

## 1.2 `src/components/messages/start-chat-dialog.tsx`

**Intent:** Clarify the auth-required dialog title — specify that the communication is via Chat.

**Location:** inside `StartChatDialog`, in the unauthenticated branch that renders `<AuthRequiredDialog>` (~line 128).

**BEFORE:**
```tsx
          title='Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό'
```

**AFTER:**
```tsx
          title='Για να επικοινωνήσεις με Chat πρέπει να έχεις λογαριασμό'
```

---

## 1.3 `src/components/shared/auth-required-dialog.tsx`

**Intent:** Keep the JSDoc example in sync with the new title text from 1.2. Comment-only change, no behavior.

**Location:** `AuthRequiredDialogProps` interface (~line 17).

**BEFORE:**
```tsx
  /** Contextual title, e.g. 'Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό' */
  title?: string;
```

**AFTER:**
```tsx
  /** Contextual title, e.g. 'Για να επικοινωνήσεις με Chat πρέπει να έχεις λογαριασμό' */
  title?: string;
```

---

## 1.4 `src/components/review/review-form.tsx`

**Intent:** Restyle the Yes/No (thumbs up/down) recommendation buttons: always side-by-side (no vertical stacking on mobile), capped width, pill shape, smooth transition.

**Location:** inside `ReviewForm`, the "Like/Unlike Buttons" section (~lines 132–160). Three class changes:

### Change A — button row container

**BEFORE:**
```tsx
        <div className='flex flex-col sm:flex-row gap-4'>
```

**AFTER:**
```tsx
        <div className='flex flex-row gap-3'>
```

### Change B — "Ναι" (ThumbsUp / rating === 5) button className

**BEFORE:**
```tsx
            className='flex-1'
```

**AFTER:**
```tsx
            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
```

### Change C — "Όχι" (ThumbsDown) button className — identical change

**BEFORE:**
```tsx
            className='flex-1'
```

**AFTER:**
```tsx
            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
```

---

## 1.5 `src/constants/datasets/about.ts`

**Intent:** Reword the FAQ answer about the Promoted-package subscription commitment (Greek copy change only).

**Location:** in `export const data`, FAQ item with `id: 'Five'`, question `'Δεσμεύομαι με τη συνδρομή του Προωθημένου πακέτου;'` (~line 185).

**BEFORE:**
```ts
        answer:
          'Όχι. Η συνδρομή είναι ευέλικτη — μπορείς να την ακυρώσεις όποτε θέλεις από το ταμπλό σου. Διατηρείς τις δυνατότητές της μέχρι το τέλος της περιόδου που έχεις ήδη πληρώσει και έπειτα επιστρέφεις αυτόματα στο δωρεάν Βασικό πακέτο.',
```

**AFTER:**
```ts
        answer:
          'Όχι, δεν υπάρχει καμία δέσμευση. Η συνδρομή είναι ευέλικτη και μπορείς να την ακυρώσεις όποτε θέλεις. Διατηρείς τις δυνατότητές της μέχρι το τέλος της περιόδου που έχεις ήδη πληρώσει και έπειτα επιστρέφεις αυτόματα στο δωρεάν Βασικό πακέτο.',
```

---

## 1.6 `src/constants/datasets/for-pros.ts`

**Intent:** Reword three benefit descriptions on the "For Pros" page (Greek copy changes only). Titles and icons unchanged.

**Location:** in `export const data`, the `list:` array (~lines 119–133).

### Item 1 — `title: 'Αυξημένη Προβολή'` (icon `flaticon-badge`)

**BEFORE:**
```ts
        desc: 'Το προφίλ σου θα εμφανίζεται σε χιλιάδες χρήστες που ψάχνουν για τις υπηρεσίες σου.',
```

**AFTER:**
```ts
        desc: 'Το προφίλ σου θα εμφανίζεται σε χιλιάδες χρήστες που ψάχνουν υπηρεσίες σαν τις δικές σου.',
```

### Item 2 — `title: 'Ασφαλείς Συναλλαγές'` (icon `flaticon-security`)

**BEFORE:**
```ts
        desc: 'Όλες οι επικοινωνίες και συναλλαγές γίνονται μέσω της ασφαλούς πλατφόρμας μας.',
```

**AFTER:**
```ts
        desc: 'Η επικοινωνία μπορεί να γίνει μέσω της ασφαλούς πλατφόρμας μας. Συνεννοείστε με τους πελάτες και τους τρόπους πληρωμής που προσφέρετε.',
```

### Item 3 — `title: 'Εύκολη Διαχείριση'` (icon `flaticon-dashboard`)

**BEFORE:**
```ts
        desc: 'Διαχειρίσου το προφίλ και τις υπηρεσίες σου εύκολα από το dashboard σου.',
```

**AFTER:**
```ts
        desc: 'Διαχειρίσου το προφίλ και τις υπηρεσίες σου εύκολα από τον Πίνακα Ελέγχου.',
```

---

# Commit 2: `b277c800` — Service card style

## 2.1 `src/components/archives/archive-service-card.tsx` — FULL LAYOUT REDESIGN

**Intent:** Redesign the archive (search-results) service card:
- **Old layout:** two-column card (`flex flex-col md:flex-row h-full md:h-52`) with a large left profile-image section — big 128px avatar over a blurred/desaturated background image of the profile photo (built with `getOptimizedImageUrl`) — and content on the right, with the profile name/badges/rating/price in a bottom bar inside the right column.
- **New layout:** single-column card. Top block (`px-6 pt-5 pb-4`) holds title + media indicators, category badges, and coverage. A new tinted **footer strip** (`border-t border-gray-100 bg-gray-50 px-6 py-3`) holds a small 36px avatar + profile name (both inside one profile link), badges, rating, and price. The big blurred backdrop and the Cloudinary optimization call are removed entirely.
- Card shell restyled to match the shared card style (see 2.2/2.3): `border-gray-200`, custom layered shadow, `hover:border-fourth/50`, `hover:-translate-y-0.5`.
- Save button repositioned from `top-3 right-3` to `top-4 right-4`.

### Change A — remove the Cloudinary import (top of file)

**BEFORE:**
```tsx
import { Card } from '@/components/ui/card';
import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import { NextLink } from '@/components';
```

**AFTER:** (the `getOptimizedImageUrl` line is deleted)
```tsx
import { Card } from '@/components/ui/card';
import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NextLink } from '@/components';
```

### Change B — remove the optimized background image computation (inside the component, right before `return`)

**DELETED:**
```tsx
  // Get optimized background image URL for profile section
  const optimizedBgImage = service.profile.image
    ? getOptimizedImageUrl(service.profile.image, 'card')
    : null;
```

### Change C — Card shell className

**BEFORE:**
```tsx
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
        className,
      )}
    >
```

**AFTER:**
```tsx
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
        className,
      )}
    >
```

### Change D — Save button position

**BEFORE:**
```tsx
      {/* Save Button */}
      <div className='absolute top-3 right-3 z-20'>
```

**AFTER:**
```tsx
      {/* Save Button */}
      <div className='absolute top-4 right-4 z-20'>
```

### Change E — entire card body replaced

**BEFORE (old two-column body — everything between the Save Button div and the closing `</Card>`):**
```tsx
      <div className='flex flex-col md:flex-row h-full md:h-52'>
        {/* Profile Image Section - Left side */}
        <div className='w-full md:w-48 flex-shrink-0 relative overflow-hidden flex md:items-center md:justify-center pl-5 md:pl-0 bg-gradient-to-br from-bluey via-white to-silver min-h-28'>
          {/* Blurred, desaturated profile image backdrop (oversized so the blur reaches the rounded corners) */}
          {optimizedBgImage && (
            <div
              aria-hidden
              className='absolute -inset-4 bg-cover bg-center blur-md saturate-[.35] opacity-30 group-hover:saturate-100 group-hover:opacity-40 transition-all duration-300'
              style={{ backgroundImage: `url(${optimizedBgImage})` }}
            ></div>
          )}

          {/* Avatar */}
          <div className='relative flex items-center justify-center py-4'>
            <UserAvatar
              displayName={service.profile.displayName}
              image={service.profile.image}
              top={profileTop}
              size='lg'
              className='h-32 w-32 rounded-xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
              showShadow={false}
            />
          </div>

        </div>

        {/* Content Section */}
        <div className='flex-1 px-6 py-4 pb-6 flex flex-col justify-between min-w-0'>
          <div className='space-y-2'>
            {/* Title */}
            <div className='flex items-center gap-3 mb-2'>
              <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
                {service.title}
              </h3>
              <MediaTypeIndicators media={service.media} className='shrink-0' />
            </div>

            {/* Category Display */}
            <TaxonomiesDisplay
              taxonomyLabels={{
                category: '',
                subcategory: categoryLabel || '',
                subdivision: subcategoryLabel || '',
              }}
              variant='badge'
            />
          </div>

          {/* Bottom Section */}
          <div className='mt-3'>
            {/* Coverage + Media Icons */}
            {profileCoverage && (
              <div className='mb-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
                <CoverageDisplay
                  online={service.type?.online}
                  onbase={service.type?.onbase}
                  onsite={service.type?.onsite}
                  area={profileCoverage?.area}
                  county={profileCoverage?.county}
                  groupedCoverage={profileGroupedCoverage}
                  variant='compact'
                  className='text-sm'
                />
              </div>
            )}

            {/* Bottom bar with profile info + rating (left) and price (right) */}
            <div className='flex items-center gap-3 border-t border-gray-100 pt-3'>
              <div className='flex items-center gap-2 flex-1 min-w-0'>
                <NextLink
                  href={`/profile/${service.profile.username}`}
                  className='group/profile relative z-20 min-w-0 block truncate'
                >
                  <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors'>
                    {service.profile.displayName}
                  </span>
                </NextLink>
                <ProfileBadges
                  verified={profileVerified}
                  topLevel={profileTop}
                  className='relative z-20 shrink-0'
                />

                {/* Rating */}
                {profileReviewCount > 0 && (
                  <RatingDisplay
                    rating={profileRating}
                    reviewCount={profileReviewCount}
                    size='sm'
                    variant='compact'
                    className='text-sm shrink-0 ml-1'
                  />
                )}
              </div>

              {/* Price */}
              {hasValidPrice && (
                <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
                  <span className='text-xs text-muted-foreground'>από</span>
                  <span className='font-bold text-dark text-lg'>
                    {priceValue}€
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
```

**AFTER (new single-column body + footer strip):**
```tsx
      <div className='px-6 pt-5 pb-4'>
        {/* Service identity: title is the dominant element of the card */}
        <div className='space-y-2 pr-12'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
              {service.title}
            </h3>
            <MediaTypeIndicators media={service.media} className='shrink-0' />
          </div>

          {/* Category Display */}
          <TaxonomiesDisplay
            taxonomyLabels={{
              category: '',
              subcategory: categoryLabel || '',
              subdivision: subcategoryLabel || '',
            }}
            variant='badge'
          />
        </div>

        {/* Coverage */}
        {profileCoverage && (
          <div className='mt-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
            <CoverageDisplay
              online={service.type?.online}
              onbase={service.type?.onbase}
              onsite={service.type?.onsite}
              area={profileCoverage?.area}
              county={profileCoverage?.county}
              groupedCoverage={profileGroupedCoverage}
              variant='compact'
              className='text-sm'
            />
          </div>
        )}
      </div>

      {/* Footer strip: tinted band that visually closes the card and separates it from the page background */}
      <div className='flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3'>
        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
          <NextLink
            href={`/profile/${service.profile.username}`}
            className='group/profile relative z-20 flex items-center gap-2.5 min-w-0'
          >
            <UserAvatar
              displayName={service.profile.displayName}
              image={service.profile.image}
              size='sm'
              className='h-9 w-9 rounded-lg ring-1 ring-black/[0.06] shrink-0'
              showBorder={false}
              showShadow={false}
            />
            <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors truncate'>
              {service.profile.displayName}
            </span>
          </NextLink>
          <ProfileBadges
            verified={profileVerified}
            topLevel={profileTop}
            className='relative z-20 shrink-0'
          />

          {/* Rating */}
          {profileReviewCount > 0 && (
            <RatingDisplay
              rating={profileRating}
              reviewCount={profileReviewCount}
              size='sm'
              variant='compact'
              className='text-sm shrink-0 ml-1'
            />
          )}
        </div>

        {/* Price */}
        {hasValidPrice && (
          <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
            <span className='text-xs text-muted-foreground'>από</span>
            <span className='font-bold text-dark text-lg'>
              {priceValue}€
            </span>
          </div>
        )}
      </div>
```

**Key semantic differences to replicate:**
1. `UserAvatar` moved from the (removed) left section into the footer strip: `size='lg'` + `h-32 w-32 rounded-xl` + `top={profileTop}` + hover scale → now `size='sm'`, `h-9 w-9 rounded-lg ring-1 ring-black/[0.06] shrink-0`, `showBorder={false}`, `showShadow={false}`, and no `top` prop.
2. The avatar is now **inside** the profile `NextLink` (link wraps avatar + name: `className='group/profile relative z-20 flex items-center gap-2.5 min-w-0'`; `truncate` moved from the link onto the name `<span>`).
3. Title block gets `pr-12` so it clears the absolutely-positioned save button.
4. The blurred profile-image backdrop, the `bg-gradient-to-br from-bluey via-white to-silver` panel, and the fixed `md:h-52` card height are all gone.
5. Footer strip adds a `bg-gray-50` tint; the old bottom bar had none.
6. Left-column gap between name/badges grew from `gap-2` to `gap-2.5`.

### Full final version of the file (for direct porting)

```tsx
import { Card } from '@/components/ui/card';
import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NextLink } from '@/components';
import ProfileBadges from '@/components/shared/profile-badges';
import RatingDisplay from '@/components/shared/rating-display';
import UserAvatar from '@/components/shared/user-avatar';
import TaxonomiesDisplay from '@/components/shared/taxonomies-display';
import { CoverageDisplay } from './coverage-display';
import { MediaTypeIndicators } from '@/components/shared/media-type-indicators';
import SaveButton from '@/components/shared/save-button';

interface ArchiveServiceCardProps {
  service: ArchiveServiceCardData | ServiceCardData;
  className?: string;
}

export function ArchiveServiceCard({
  service,
  className,
}: ArchiveServiceCardProps) {
  // Check if service has taxonomyLabels (ArchiveServiceCardData) or just category (ServiceCardData)
  const hasDetailedTaxonomies = 'taxonomyLabels' in service;

  // Show subcategory as the main category and subdivision as the subcategory
  const categoryLabel = hasDetailedTaxonomies
    ? service.taxonomyLabels.subcategory
    : (service as ServiceCardData).category;
  const subcategoryLabel = hasDetailedTaxonomies
    ? service.taxonomyLabels.subdivision
    : '';

  // Check if profile has coverage data (might not exist in ServiceCardData)
  const profileCoverage =
    'coverage' in service.profile ? service.profile.coverage : undefined;
  const profileVerified =
    'verified' in service.profile ? service.profile.verified : false;
  const profileTop = 'top' in service.profile ? service.profile.top : false;
  const profileGroupedCoverage =
    'groupedCoverage' in service.profile
      ? service.profile.groupedCoverage
      : [];

  // Check if profile has rating data (might not exist in ServiceCardData)
  const profileRating =
    'rating' in service.profile ? service.profile.rating : 0;
  const profileReviewCount =
    'reviewCount' in service.profile ? service.profile.reviewCount : 0;

  // Convert price to number for reliable comparison
  const priceValue = Number(service?.price) || 0;
  const hasValidPrice = priceValue > 0;

  return (
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
        className,
      )}
    >
      {/* Whole-card link to the service page */}
      <NextLink
        href={`/s/${service.slug}`}
        className='absolute inset-0 z-10'
        aria-label={service.title}
      />

      {/* Save Button */}
      <div className='absolute top-4 right-4 z-20'>
        <SaveButton itemType='service' itemId={service.id} ownerId={service.profile.uid} />
      </div>

      <div className='px-6 pt-5 pb-4'>
        {/* Service identity: title is the dominant element of the card */}
        <div className='space-y-2 pr-12'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
              {service.title}
            </h3>
            <MediaTypeIndicators media={service.media} className='shrink-0' />
          </div>

          {/* Category Display */}
          <TaxonomiesDisplay
            taxonomyLabels={{
              category: '',
              subcategory: categoryLabel || '',
              subdivision: subcategoryLabel || '',
            }}
            variant='badge'
          />
        </div>

        {/* Coverage */}
        {profileCoverage && (
          <div className='mt-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
            <CoverageDisplay
              online={service.type?.online}
              onbase={service.type?.onbase}
              onsite={service.type?.onsite}
              area={profileCoverage?.area}
              county={profileCoverage?.county}
              groupedCoverage={profileGroupedCoverage}
              variant='compact'
              className='text-sm'
            />
          </div>
        )}
      </div>

      {/* Footer strip: tinted band that visually closes the card and separates it from the page background */}
      <div className='flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3'>
        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
          <NextLink
            href={`/profile/${service.profile.username}`}
            className='group/profile relative z-20 flex items-center gap-2.5 min-w-0'
          >
            <UserAvatar
              displayName={service.profile.displayName}
              image={service.profile.image}
              size='sm'
              className='h-9 w-9 rounded-lg ring-1 ring-black/[0.06] shrink-0'
              showBorder={false}
              showShadow={false}
            />
            <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors truncate'>
              {service.profile.displayName}
            </span>
          </NextLink>
          <ProfileBadges
            verified={profileVerified}
            topLevel={profileTop}
            className='relative z-20 shrink-0'
          />

          {/* Rating */}
          {profileReviewCount > 0 && (
            <RatingDisplay
              rating={profileRating}
              reviewCount={profileReviewCount}
              size='sm'
              variant='compact'
              className='text-sm shrink-0 ml-1'
            />
          )}
        </div>

        {/* Price */}
        {hasValidPrice && (
          <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
            <span className='text-xs text-muted-foreground'>από</span>
            <span className='font-bold text-dark text-lg'>
              {priceValue}€
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

## 2.2 `src/components/shared/service-card.tsx`

**Intent:** Match the new card shell style — stronger border (`gray-100` → `gray-200`), custom layered soft shadow instead of `shadow-sm`, stronger hover border (`fourth/40` → `fourth/50`). One-line className change on the root `<Card>` (~line 47).

**BEFORE:**
```tsx
    <Card className='group overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white relative h-full flex flex-col'>
```

**AFTER:**
```tsx
    <Card className='group overflow-hidden border border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white relative h-full flex flex-col'>
```

---

## 2.3 `src/components/shared/service-media-card.tsx`

**Intent:** Same shell restyle as 2.2, plus a new hover lift (`hover:-translate-y-0.5`) that this card previously did not have. One-line className change on the root `<Card>` (~line 35).

**BEFORE:**
```tsx
        'group rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
```

**AFTER:**
```tsx
        'group rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
```

---

# Shared design tokens introduced in this PR

The three card components now share this shell recipe — apply it consistently in the target app:

```
border-gray-200
shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)]
hover:shadow-xl hover:shadow-dark/[0.07]
hover:border-fourth/50
hover:-translate-y-0.5        (or -translate-y-1 on the shared ServiceCard)
transition-all duration-300
rounded-2xl overflow-hidden
```

Note: `dark`, `third`, `fourth`, `body`, `bluey`, `silver` are custom Tailwind theme colors of this project — the target app must have equivalents defined in its Tailwind config for the classes to work.

---

# Appendix — Raw unified diff of the whole PR (machine-exact)

This is the verbatim output of `git diff 7a037429..b277c800` (state before the PR → state after the PR). It is the authoritative source; the sections above are a readable walkthrough of exactly this patch.

```diff
diff --git a/src/app/(dashboard)/dashboard/checkout/checkout-content.tsx b/src/app/(dashboard)/dashboard/checkout/checkout-content.tsx
index 40daa3db..2bfc1878 100644
--- a/src/app/(dashboard)/dashboard/checkout/checkout-content.tsx
+++ b/src/app/(dashboard)/dashboard/checkout/checkout-content.tsx
@@ -36,6 +36,10 @@ interface CheckoutContentProps {
   defaultInterval: BillingInterval;
 }
 
+// Coupon input is temporarily hidden from checkout (kept fully functional in code
+// so it can be re-enabled later just by flipping this flag back to true).
+const COUPON_INPUT_VISIBLE = false;
+
 export default function CheckoutContent({
   user,
   profile,
@@ -1270,60 +1274,62 @@ export default function CheckoutContent({
               </div>
             </div>
 
-            {/* Coupon Input */}
-            <div className='space-y-2'>
-              {couponState.status === 'valid' ? (
-                <div className='flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2'>
-                  <div className='flex items-center gap-2 text-sm text-green-700'>
-                    <Tag className='size-4' />
-                    <span className='font-medium'>{couponState.code}</span>
-                    <span>(-{couponState.percentOff}%)</span>
+            {/* Coupon Input - hidden for now, see COUPON_INPUT_VISIBLE above */}
+            {COUPON_INPUT_VISIBLE && (
+              <div className='space-y-2'>
+                {couponState.status === 'valid' ? (
+                  <div className='flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2'>
+                    <div className='flex items-center gap-2 text-sm text-green-700'>
+                      <Tag className='size-4' />
+                      <span className='font-medium'>{couponState.code}</span>
+                      <span>(-{couponState.percentOff}%)</span>
+                    </div>
+                    <button
+                      type='button'
+                      onClick={handleRemoveCoupon}
+                      className='text-green-600 hover:text-green-800'
+                    >
+                      <X className='size-4' />
+                    </button>
                   </div>
-                  <button
-                    type='button'
-                    onClick={handleRemoveCoupon}
-                    className='text-green-600 hover:text-green-800'
-                  >
-                    <X className='size-4' />
-                  </button>
-                </div>
-              ) : (
-                <div className='flex gap-2'>
-                  <Input
-                    placeholder='Κωδικός κουπονιού'
-                    value={couponInput}
-                    onChange={(e) => {
-                      setCouponInput(e.target.value);
-                      if (couponState.status === 'error') {
-                        setCouponState({ status: 'idle' });
-                      }
-                    }}
-                    onKeyDown={(e) => {
-                      if (e.key === 'Enter') {
-                        e.preventDefault();
-                        handleApplyCoupon();
-                      }
-                    }}
-                    className='flex-1'
-                  />
-                  <Button
-                    variant='outline'
-                    size='default'
-                    onClick={handleApplyCoupon}
-                    disabled={couponLoading || !couponInput.trim()}
-                  >
-                    {couponLoading ? (
-                      <Loader2 className='size-4 animate-spin' />
-                    ) : (
-                      'Εφαρμογή'
-                    )}
-                  </Button>
-                </div>
-              )}
-              {couponState.status === 'error' && couponState.message && (
-                <p className='text-xs text-red-600'>{couponState.message}</p>
-              )}
-            </div>
+                ) : (
+                  <div className='flex gap-2'>
+                    <Input
+                      placeholder='Κωδικός κουπονιού'
+                      value={couponInput}
+                      onChange={(e) => {
+                        setCouponInput(e.target.value);
+                        if (couponState.status === 'error') {
+                          setCouponState({ status: 'idle' });
+                        }
+                      }}
+                      onKeyDown={(e) => {
+                        if (e.key === 'Enter') {
+                          e.preventDefault();
+                          handleApplyCoupon();
+                        }
+                      }}
+                      className='flex-1'
+                    />
+                    <Button
+                      variant='outline'
+                      size='default'
+                      onClick={handleApplyCoupon}
+                      disabled={couponLoading || !couponInput.trim()}
+                    >
+                      {couponLoading ? (
+                        <Loader2 className='size-4 animate-spin' />
+                      ) : (
+                        'Εφαρμογή'
+                      )}
+                    </Button>
+                  </div>
+                )}
+                {couponState.status === 'error' && couponState.message && (
+                  <p className='text-xs text-red-600'>{couponState.message}</p>
+                )}
+              </div>
+            )}
 
             {/* Checkout Button */}
             <Button
diff --git a/src/components/archives/archive-service-card.tsx b/src/components/archives/archive-service-card.tsx
index d09c3ec9..9b323160 100644
--- a/src/components/archives/archive-service-card.tsx
+++ b/src/components/archives/archive-service-card.tsx
@@ -2,7 +2,6 @@ import { Card } from '@/components/ui/card';
 import type { ArchiveServiceCardData } from '@/lib/types/components';
 import type { ServiceCardData } from '@/lib/types';
 import { cn } from '@/lib/utils';
-import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
 import { NextLink } from '@/components';
 import ProfileBadges from '@/components/shared/profile-badges';
 import RatingDisplay from '@/components/shared/rating-display';
@@ -53,15 +52,10 @@ export function ArchiveServiceCard({
   const priceValue = Number(service?.price) || 0;
   const hasValidPrice = priceValue > 0;
 
-  // Get optimized background image URL for profile section
-  const optimizedBgImage = service.profile.image
-    ? getOptimizedImageUrl(service.profile.image, 'card')
-    : null;
-
   return (
     <Card
       className={cn(
-        'group relative rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
+        'group relative rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
         className,
       )}
     >
@@ -73,117 +67,94 @@ export function ArchiveServiceCard({
       />
 
       {/* Save Button */}
-      <div className='absolute top-3 right-3 z-20'>
+      <div className='absolute top-4 right-4 z-20'>
         <SaveButton itemType='service' itemId={service.id} ownerId={service.profile.uid} />
       </div>
 
-      <div className='flex flex-col md:flex-row h-full md:h-52'>
-        {/* Profile Image Section - Left side */}
-        <div className='w-full md:w-48 flex-shrink-0 relative overflow-hidden flex md:items-center md:justify-center pl-5 md:pl-0 bg-gradient-to-br from-bluey via-white to-silver min-h-28'>
-          {/* Blurred, desaturated profile image backdrop (oversized so the blur reaches the rounded corners) */}
-          {optimizedBgImage && (
-            <div
-              aria-hidden
-              className='absolute -inset-4 bg-cover bg-center blur-md saturate-[.35] opacity-30 group-hover:saturate-100 group-hover:opacity-40 transition-all duration-300'
-              style={{ backgroundImage: `url(${optimizedBgImage})` }}
-            ></div>
-          )}
-
-          {/* Avatar */}
-          <div className='relative flex items-center justify-center py-4'>
-            <UserAvatar
-              displayName={service.profile.displayName}
-              image={service.profile.image}
-              top={profileTop}
-              size='lg'
-              className='h-32 w-32 rounded-xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
-              showShadow={false}
-            />
+      <div className='px-6 pt-5 pb-4'>
+        {/* Service identity: title is the dominant element of the card */}
+        <div className='space-y-2 pr-12'>
+          <div className='flex items-center gap-3'>
+            <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
+              {service.title}
+            </h3>
+            <MediaTypeIndicators media={service.media} className='shrink-0' />
           </div>
 
+          {/* Category Display */}
+          <TaxonomiesDisplay
+            taxonomyLabels={{
+              category: '',
+              subcategory: categoryLabel || '',
+              subdivision: subcategoryLabel || '',
+            }}
+            variant='badge'
+          />
         </div>
 
-        {/* Content Section */}
-        <div className='flex-1 px-6 py-4 pb-6 flex flex-col justify-between min-w-0'>
-          <div className='space-y-2'>
-            {/* Title */}
-            <div className='flex items-center gap-3 mb-2'>
-              <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
-                {service.title}
-              </h3>
-              <MediaTypeIndicators media={service.media} className='shrink-0' />
-            </div>
-
-            {/* Category Display */}
-            <TaxonomiesDisplay
-              taxonomyLabels={{
-                category: '',
-                subcategory: categoryLabel || '',
-                subdivision: subcategoryLabel || '',
-              }}
-              variant='badge'
+        {/* Coverage */}
+        {profileCoverage && (
+          <div className='mt-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
+            <CoverageDisplay
+              online={service.type?.online}
+              onbase={service.type?.onbase}
+              onsite={service.type?.onsite}
+              area={profileCoverage?.area}
+              county={profileCoverage?.county}
+              groupedCoverage={profileGroupedCoverage}
+              variant='compact'
+              className='text-sm'
             />
           </div>
+        )}
+      </div>
 
-          {/* Bottom Section */}
-          <div className='mt-3'>
-            {/* Coverage + Media Icons */}
-            {profileCoverage && (
-              <div className='mb-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
-                <CoverageDisplay
-                  online={service.type?.online}
-                  onbase={service.type?.onbase}
-                  onsite={service.type?.onsite}
-                  area={profileCoverage?.area}
-                  county={profileCoverage?.county}
-                  groupedCoverage={profileGroupedCoverage}
-                  variant='compact'
-                  className='text-sm'
-                />
-              </div>
-            )}
-
-            {/* Bottom bar with profile info + rating (left) and price (right) */}
-            <div className='flex items-center gap-3 border-t border-gray-100 pt-3'>
-              <div className='flex items-center gap-2 flex-1 min-w-0'>
-                <NextLink
-                  href={`/profile/${service.profile.username}`}
-                  className='group/profile relative z-20 min-w-0 block truncate'
-                >
-                  <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors'>
-                    {service.profile.displayName}
-                  </span>
-                </NextLink>
-                <ProfileBadges
-                  verified={profileVerified}
-                  topLevel={profileTop}
-                  className='relative z-20 shrink-0'
-                />
-
-                {/* Rating */}
-                {profileReviewCount > 0 && (
-                  <RatingDisplay
-                    rating={profileRating}
-                    reviewCount={profileReviewCount}
-                    size='sm'
-                    variant='compact'
-                    className='text-sm shrink-0 ml-1'
-                  />
-                )}
-              </div>
+      {/* Footer strip: tinted band that visually closes the card and separates it from the page background */}
+      <div className='flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3'>
+        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
+          <NextLink
+            href={`/profile/${service.profile.username}`}
+            className='group/profile relative z-20 flex items-center gap-2.5 min-w-0'
+          >
+            <UserAvatar
+              displayName={service.profile.displayName}
+              image={service.profile.image}
+              size='sm'
+              className='h-9 w-9 rounded-lg ring-1 ring-black/[0.06] shrink-0'
+              showBorder={false}
+              showShadow={false}
+            />
+            <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors truncate'>
+              {service.profile.displayName}
+            </span>
+          </NextLink>
+          <ProfileBadges
+            verified={profileVerified}
+            topLevel={profileTop}
+            className='relative z-20 shrink-0'
+          />
+
+          {/* Rating */}
+          {profileReviewCount > 0 && (
+            <RatingDisplay
+              rating={profileRating}
+              reviewCount={profileReviewCount}
+              size='sm'
+              variant='compact'
+              className='text-sm shrink-0 ml-1'
+            />
+          )}
+        </div>
 
-              {/* Price */}
-              {hasValidPrice && (
-                <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
-                  <span className='text-xs text-muted-foreground'>από</span>
-                  <span className='font-bold text-dark text-lg'>
-                    {priceValue}€
-                  </span>
-                </div>
-              )}
-            </div>
+        {/* Price */}
+        {hasValidPrice && (
+          <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
+            <span className='text-xs text-muted-foreground'>από</span>
+            <span className='font-bold text-dark text-lg'>
+              {priceValue}€
+            </span>
           </div>
-        </div>
+        )}
       </div>
     </Card>
   );
diff --git a/src/components/messages/start-chat-dialog.tsx b/src/components/messages/start-chat-dialog.tsx
index c6cdcea2..786c2430 100644
--- a/src/components/messages/start-chat-dialog.tsx
+++ b/src/components/messages/start-chat-dialog.tsx
@@ -125,7 +125,7 @@ export function StartChatDialog({
         <AuthRequiredDialog
           open={open}
           onOpenChange={setOpen}
-          title='Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό'
+          title='Για να επικοινωνήσεις με Chat πρέπει να έχεις λογαριασμό'
         />
       </div>
     );
diff --git a/src/components/review/review-form.tsx b/src/components/review/review-form.tsx
index e49cea48..2330bb1d 100644
--- a/src/components/review/review-form.tsx
+++ b/src/components/review/review-form.tsx
@@ -132,7 +132,7 @@ export function ReviewForm({
       {/* Like/Unlike Buttons - Boss requirement */}
       <div className='space-y-3'>
         <Label className='text-base font-semibold'>Θα σύστηνες την υπηρεσία και σε άλλους;</Label>
-        <div className='flex flex-col sm:flex-row gap-4'>
+        <div className='flex flex-row gap-3'>
           <Button
             type='button'
             variant={rating === 5 ? 'secondary' : 'outline'}
@@ -142,7 +142,7 @@ export function ReviewForm({
               setShowComment(true);
             }}
             disabled={isPending}
-            className='flex-1'
+            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
           >
             <ThumbsUp className='mr-2 h-5 w-5' />
             Ναι
@@ -157,7 +157,7 @@ export function ReviewForm({
               setShowComment(true);
             }}
             disabled={isPending}
-            className='flex-1'
+            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
           >
             <ThumbsDown className='mr-2 h-5 w-5' />
             Όχι
diff --git a/src/components/shared/auth-required-dialog.tsx b/src/components/shared/auth-required-dialog.tsx
index 0700e64f..f9415b04 100644
--- a/src/components/shared/auth-required-dialog.tsx
+++ b/src/components/shared/auth-required-dialog.tsx
@@ -14,7 +14,7 @@ import { Button } from '@/components/ui/button';
 interface AuthRequiredDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
-  /** Contextual title, e.g. 'Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό' */
+  /** Contextual title, e.g. 'Για να επικοινωνήσεις με Chat πρέπει να έχεις λογαριασμό' */
   title?: string;
 }
 
diff --git a/src/components/shared/service-card.tsx b/src/components/shared/service-card.tsx
index df3b4409..4f4035f0 100644
--- a/src/components/shared/service-card.tsx
+++ b/src/components/shared/service-card.tsx
@@ -44,7 +44,7 @@ export default function ServiceCard({
     : null;
 
   return (
-    <Card className='group overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white relative h-full flex flex-col'>
+    <Card className='group overflow-hidden border border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white relative h-full flex flex-col'>
       {/* Whole-card link to the service page */}
       <NextLink
         href={`/s/${service.slug}`}
diff --git a/src/components/shared/service-media-card.tsx b/src/components/shared/service-media-card.tsx
index 80db487e..c7234d15 100644
--- a/src/components/shared/service-media-card.tsx
+++ b/src/components/shared/service-media-card.tsx
@@ -32,7 +32,7 @@ export function ServiceMediaCard({
   return (
     <Card
       className={cn(
-        'group rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
+        'group rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
         className,
       )}
     >
diff --git a/src/constants/datasets/about.ts b/src/constants/datasets/about.ts
index 7e7a43d5..27f42753 100644
--- a/src/constants/datasets/about.ts
+++ b/src/constants/datasets/about.ts
@@ -182,7 +182,7 @@ export const data = {
         id: 'Five',
         question: 'Δεσμεύομαι με τη συνδρομή του Προωθημένου πακέτου;',
         answer:
-          'Όχι. Η συνδρομή είναι ευέλικτη — μπορείς να την ακυρώσεις όποτε θέλεις από το ταμπλό σου. Διατηρείς τις δυνατότητές της μέχρι το τέλος της περιόδου που έχεις ήδη πληρώσει και έπειτα επιστρέφεις αυτόματα στο δωρεάν Βασικό πακέτο.',
+          'Όχι, δεν υπάρχει καμία δέσμευση. Η συνδρομή είναι ευέλικτη και μπορείς να την ακυρώσεις όποτε θέλεις. Διατηρείς τις δυνατότητές της μέχρι το τέλος της περιόδου που έχεις ήδη πληρώσει και έπειτα επιστρέφεις αυτόματα στο δωρεάν Βασικό πακέτο.',
         isOpen: false,
       },
     ],
diff --git a/src/constants/datasets/for-pros.ts b/src/constants/datasets/for-pros.ts
index f74f8f8e..d0d8ed88 100644
--- a/src/constants/datasets/for-pros.ts
+++ b/src/constants/datasets/for-pros.ts
@@ -119,17 +119,17 @@ export const data = {
     list: [
       {
         title: 'Αυξημένη Προβολή',
-        desc: 'Το προφίλ σου θα εμφανίζεται σε χιλιάδες χρήστες που ψάχνουν για τις υπηρεσίες σου.',
+        desc: 'Το προφίλ σου θα εμφανίζεται σε χιλιάδες χρήστες που ψάχνουν υπηρεσίες σαν τις δικές σου.',
         icon: 'flaticon-badge',
       },
       {
         title: 'Ασφαλείς Συναλλαγές',
-        desc: 'Όλες οι επικοινωνίες και συναλλαγές γίνονται μέσω της ασφαλούς πλατφόρμας μας.',
+        desc: 'Η επικοινωνία μπορεί να γίνει μέσω της ασφαλούς πλατφόρμας μας. Συνεννοείστε με τους πελάτες και τους τρόπους πληρωμής που προσφέρετε.',
         icon: 'flaticon-security',
       },
       {
         title: 'Εύκολη Διαχείριση',
-        desc: 'Διαχειρίσου το προφίλ και τις υπηρεσίες σου εύκολα από το dashboard σου.',
+        desc: 'Διαχειρίσου το προφίλ και τις υπηρεσίες σου εύκολα από τον Πίνακα Ελέγχου.',
         icon: 'flaticon-dashboard',
       },
     ],
```
