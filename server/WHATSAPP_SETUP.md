# WhatsApp due-date reminders

CardFlow includes an opt-in settings panel, a Meta Cloud API template sender, a signed webhook that handles STOP/unsubscribe replies, and an authenticated daily job endpoint. Delivery remains disabled until the deployment is configured.

## Requirements before enabling delivery

1. Create a WhatsApp Business Platform / Cloud API app in Meta, add a business phone number, and obtain its phone number ID and access token.
2. Create and get approval for a Utility message template with four body variables. The sender supplies, in order: card name, amount due, due date, and timing (`in 3 days`, `in 1 day`, or `today`). Include opt-out text such as “Reply STOP to stop reminders.”
3. Set these secrets on the CardFlow web service:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_TEMPLATE_NAME`
   - `WHATSAPP_TEMPLATE_LANGUAGE` (for example `en_US`)
   - `WHATSAPP_GRAPH_API_VERSION` (a currently supported Graph API version)
   - `WHATSAPP_CRON_SECRET` (a long random secret)
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (a separate random secret)
   - `META_APP_SECRET`
4. Configure the Meta webhook callback as `https://<CardFlow-host>/api/whatsapp/webhook`, using the same verify token, and subscribe it to `messages`.
5. Use durable server-side storage for user cards, phone numbers, opt-in state, and sent-message deduplication. The current Render Free deployment uses a local JSON file, which is erased when the service spins down or redeploys; do not enable scheduled sending on that storage.
6. Configure a daily scheduler to run `npm --prefix server run whatsapp-reminders` with `CARDFLOW_BASE_URL` and the same `WHATSAPP_CRON_SECRET`. Only after the scheduler and durable storage are in place, set `WHATSAPP_REMINDER_JOB_ENABLED=true` on the web service.

The scheduled job sends reminders at 3 days before, 1 day before, and on the due date. It only sends for bills with a positive saved statement balance and explicit in-app opt-in. Incoming STOP, STOP ALL, UNSUBSCRIBE, CANCEL, END, or QUIT messages disable the recipient’s reminders.
