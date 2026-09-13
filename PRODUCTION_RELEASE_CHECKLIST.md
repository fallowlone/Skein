# Production Release Checklist

## Code

- [x] Build passes.
- [x] Type checks pass.
- [ ] Database migrations reviewed before release.
- [x] No known debug code added.

## Security

- [x] Authentication flow reviewed.
- [x] Authorization boundaries reviewed.
- [x] Payment flow reviewed.
- [ ] Production secrets verified in deployment environment.

## User flows

- [x] Guest access reviewed.
- [x] Registered user flow reviewed.
- [x] Premium entitlement flow reviewed.

## Deployment

- [ ] Production environment variables verified.
- [ ] Rollback procedure tested.
- [ ] Monitoring enabled.

## Post launch

First 24 hours:

- watch errors and payments;
- verify user registrations;
- check deployment stability.

First 7 days:

- review product metrics;
- review support issues;
- prioritize fixes.

