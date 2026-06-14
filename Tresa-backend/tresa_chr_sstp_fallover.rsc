# ============================================================
# RENULT BILLING — CHR CONCENTRATOR SSTP FALLOVER ADDON
# Insert this block AFTER Step 5 (L2TP server) in bootstrap v7
# Safe to re-run — idempotent.
# Adds SSTP as a fallover tunnel for customer routers.
# Does NOT touch L2TP, firewall, NAT, or API config.
# ============================================================

# ============================================================
# STEP 5B — SSTP SERVER (FALLOVER FOR L2TP)
# Customers behind ISPs that block UDP (kills L2TP) will use
# SSTP over TCP/443 as fallover. Same PPP profile and pool
# as L2TP — a router can only be connected via one at a time.
# ============================================================
:put "Step 5b: Setting up SSTP server as L2TP fallover..."

# --- 5B.1: Generate self-signed CA certificate (idempotent) ---
:if ([:len [/certificate find where name="tresa-sstp-ca"]] = 0) do={
    :put "  Creating SSTP CA certificate..."
    /certificate add name=tresa-sstp-ca common-name=tresa-sstp-ca \
        key-usage=key-cert-sign,crl-sign
    /certificate sign tresa-sstp-ca
    :put "  CA certificate signed."
} else={
    :put "  SSTP CA certificate already exists — skipping."
}

# --- 5B.2: Generate server certificate signed by CA (idempotent) ---
:if ([:len [/certificate find where name="tresa-sstp-server"]] = 0) do={
    :put "  Creating SSTP server certificate..."
    /certificate add name=tresa-sstp-server common-name=$chrPublicIp
    /certificate sign tresa-sstp-server ca=tresa-sstp-ca
    :put "  Server certificate signed."
} else={
    :put "  SSTP server certificate already exists — skipping."
}

# --- 5B.3: Enable SSTP server using existing L2TP PPP profile ---
# Uses tresa-l2tp-profile (same pool, same local address 10.0.0.1)
# so SSTP-connected routers get IPs from the same tunnel pool.
/interface sstp-server server set \
    enabled=yes \
    certificate=tresa-sstp-server \
    authentication=mschap2 \
    verify-client-certificate=no \
    default-profile=tresa-l2tp-profile \
    pfs=no \
    tls-version=any
:put "  SSTP server enabled on port 443."

# --- 5B.4: Firewall — allow SSTP (TCP/443) on input chain ---
# Remove old rule first (idempotent), then re-add at position 0
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow SSTP"] do={
    /ip firewall filter remove $r
}
/ip firewall filter add \
    chain=input \
    protocol=tcp \
    dst-port=443 \
    action=accept \
    comment="Tresa CHR: allow SSTP"
:do { /ip firewall filter move [find where comment="Tresa CHR: allow SSTP"] 0 } on-error={}
:put "  Firewall rule for SSTP added."

# --- 5B.5: Firewall — allow SSTP forwarded API/SNMP dstnat ---
# Allows forwarded connections (CHR -> customer via SSTP tunnel)
# Same pattern as the existing L2TP dstnat forward rule.
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow SSTP API dstnat"] do={
    /ip firewall filter remove $r
}
/ip firewall filter add \
    chain=forward \
    protocol=tcp \
    dst-port=8728 \
    connection-nat-state=dstnat \
    action=accept \
    comment="Tresa CHR: allow SSTP API dstnat"
:do { /ip firewall filter move [find where comment="Tresa CHR: allow SSTP API dstnat"] 0 } on-error={}
:put "  Forward rule for SSTP API dstnat added."

:put "Step 5b: Done."

# ============================================================
# VERIFY STEP FOR STEP 9 — ADD THESE CHECKS TO YOUR STEP 9
# Copy-paste the block below into your existing Step 9 verify
# section in bootstrap v7.
# ============================================================

# --- SSTP server verify ---
:if ([/interface sstp-server server get enabled] != true) do={
    :put "  VERIFY FAILED: SSTP server is disabled."
    :set verifyFailed true
} else={
    :put "  SSTP server       : ENABLED (port 443 — L2TP fallover)"
}

:if ([:len [/certificate find where name="tresa-sstp-server"]] = 0) do={
    :put "  VERIFY FAILED: SSTP server certificate missing."
    :set verifyFailed true
} else={
    :put "  SSTP certificate  : OK"
}

:if ([:len [/ip firewall filter find where comment="Tresa CHR: allow SSTP"]] = 0) do={
    :put "  VERIFY FAILED: SSTP firewall rule missing."
    :set verifyFailed true
} else={
    :put "  SSTP firewall     : OK"
}

# ============================================================
# CUSTOMER ROUTER SSTP CLIENT SCRIPT (for provisioning)
# When generating a customer registration script, add this
# SSTP client block AFTER the L2TP client setup.
# Replace $pppUser, $pppPassword, $chrPublicIp with actuals.
# ============================================================

# /interface sstp-client add \
#     name=TRESA_REMOTE_SSTP \
#     connect-to=$chrPublicIp \
#     user=$pppUser \
#     password=$pppPassword \
#     add-default-route=no \
#     verify-server-certificate=no \
#     profile=default \
#     authentication=mschap2 \
#     disabled=no \
#     comment="RENULT BILLING SSTP fallover — auto-provisioned"
#
# FALLOVER LOGIC: Customer router script should check L2TP status.
# If L2TP is not running after 60s, enable SSTP client.
# Both use same PPP credentials — only one connects at a time.
#
# /system scheduler add \
#     name=tresa-sstp-fallover \
#     interval=60s \
#     on-event={
#         :local l2tpUp [/interface l2tp-client get [find name=TRESA_REMOTE] running]
#         :local sstpUp [/interface sstp-client get [find name=TRESA_REMOTE_SSTP] running]
#         :if ($l2tpUp = true) do={
#             :if ($sstpUp = true) do={
#                 /interface sstp-client disable [find name=TRESA_REMOTE_SSTP]
#             }
#         } else={
#             :if ($sstpUp = false) do={
#                 /interface sstp-client enable [find name=TRESA_REMOTE_SSTP]
#             }
#         }
#     } \
#     comment="RENULT BILLING: SSTP fallover watchdog"
