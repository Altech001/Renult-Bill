# Renault WIFI MikroTik Deployment

## Portal files

Upload the contents of this folder to the MikroTik hotspot HTML directory. Keep
`login.html`, `md5.js`, `errors.txt`, `alogin.html`, `status.html`,
`logout.html`, `error.html`, `rlogin.html`, `redirect.html`, and `portal.css`
together.

`index.html` is retained for normal browser previews. RouterOS uses
`login.html`.

## Router ID

The portal currently sends this backend router identifier:

```text
NEW MIKROTIK ROUTER
```

It is configured as `ROUTER_ID` in `login.html` and `index.html`. The same ID
must exist in the Renault billing backend.

## Walled garden

Allow the Renault payment and voucher API before authentication:

```routeros
/ip hotspot walled-garden add dst-host=renult.vercel.app
```

If the router uses a strict DNS or firewall policy, also ensure hotspot clients
can resolve DNS and make HTTPS connections to `renult.vercel.app`.

## Hotspot profile

Point the hotspot profile at the directory containing these files. For a
standard `hotspot` directory and profile named `hsprof1`:

```routeros
/ip hotspot profile set [find name="hsprof1"] html-directory=hotspot
```

The portal supports both voucher authentication styles used by the Luco
portal: an empty password first, then the voucher code as both username and
password if RouterOS rejects the first attempt.

## Troubleshooting: edits to `login.html` don't appear after redeploy

The "Push to MikroTik" and "Deploy via R2" actions do **not** read your local
copy of this file. They read `app/portal/renault/login.html` from the
**Tresa-backend server's own deployed filesystem** (see `PORTAL_ROOT` in
`app/services/portal.py`), render it (substituting `__PORTAL_API_BASE__`,
`__ROUTER_PUBLIC_ID__`, `__ROUTER_NAME__`), and push that rendered copy to the
router.

So if you edit `login.html` locally and immediately click "Push to MikroTik"
or "Deploy via R2", the router will receive the **old** template that's still
running on the backend — your edits won't show up.

To make edits to `login.html` (or any other portal file) take effect:

1. Commit/push your changes.
2. Redeploy the Tresa-backend service itself (e.g. trigger a new Vercel/host
   deployment) so the server's filesystem has the updated `login.html`.
3. Only then click "Push to MikroTik" or "Deploy via R2" from the dashboard —
   this re-renders the new template and pushes/fetches it onto the router.

If step 3 is done before step 2, the router will be re-flashed with the same
old content, which looks like "my edit didn't work".
