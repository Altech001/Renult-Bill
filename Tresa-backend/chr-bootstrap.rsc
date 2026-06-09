# TRESA BILL CHR CONCENTRATOR BOOTSTRAP v5
# Safe to run again — idempotent

:local apiPassword "ac23353c63370ee0e6e323f9e5fb9cd5"
:local ipsecSecret "k1YFP7xMv02keVk4oTmF558cchIUuasJqJEDK8kSrTBiSS6c"

# ============================================================
# STEP 1 — API USER GROUP AND USER
# ============================================================
:put "Step 1: Creating API user..."
:if ([:len [/user group find where name="tresa-concentrator"]] = 0) do={
    /user group add name=tresa-concentrator policy=api,read,write,policy,test,sensitive
} else={
    /user group set [find where name="tresa-concentrator"] policy=api,read,write,policy,test,sensitive
}
:if ([:len [/user find where name="tresachr"]] = 0) do={
    /user add name=tresachr password=$apiPassword group=tresa-concentrator disabled=no comment="Tresa CHR API - DO NOT DELETE"
} else={
    /user set [find where name="tresachr"] password=$apiPassword group=tresa-concentrator disabled=no comment="Tresa CHR API - DO NOT DELETE"
}
:put "Step 1: Done."

# ============================================================
# STEP 2 — TUNNEL IP POOL
# ============================================================
:put "Step 2: Creating tunnel pool..."
:if ([:len [/ip pool find where name="tresa-tunnel-pool"]] = 0) do={
    /ip pool add name=tresa-tunnel-pool ranges=10.0.1.2-10.0.255.254
} else={
    /ip pool set [find where name="tresa-tunnel-pool"] ranges=10.0.1.2-10.0.255.254
}
:put "Step 2: Done."

# ============================================================
# STEP 3 — PPP PROFILE
# ============================================================
:put "Step 3: Creating PPP profile..."
:if ([:len [/ppp profile find where name="tresa-l2tp-profile"]] = 0) do={
    /ppp profile add name=tresa-l2tp-profile local-address=10.0.0.1 remote-address=tresa-tunnel-pool only-one=yes change-tcp-mss=yes use-encryption=yes
} else={
    /ppp profile set [find where name="tresa-l2tp-profile"] local-address=10.0.0.1 remote-address=tresa-tunnel-pool only-one=yes change-tcp-mss=yes use-encryption=yes
}
:put "Step 3: Done."

# ============================================================
# STEP 4 — L2TP SERVER
# ============================================================
:put "Step 4: Enabling L2TP server..."
/interface l2tp-server server set enabled=yes default-profile=tresa-l2tp-profile authentication=mschap2 use-ipsec=yes ipsec-secret=$ipsecSecret max-mtu=1460 max-mru=1460 keepalive-timeout=30
:put "Step 4: Done."

# ============================================================
# STEP 5 — API SERVICE
# ============================================================
:put "Step 5: Moving API to port 51847..."
/ip service set api disabled=no port=51847 address=0.0.0.0/0
/ip service set api-ssl disabled=yes
/ip service set winbox address=10.0.0.0/16,192.168.88.0/24
:put "Step 5: Done."

# ============================================================
# STEP 6 — FIREWALL RULES (remove old, add fresh — no place-before)
# ============================================================
:put "Step 6: Installing firewall rules..."

# Remove existing Tresa rules first
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: drop API blacklist"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: API brute force"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow API"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow IKE NAT-T"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow L2TP IPsec"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow ESP"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: established input"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: established forward"] do={ /ip firewall filter remove $r }
:foreach r in=[/ip firewall filter find where comment="Tresa CHR: allow router API dstnat"] do={ /ip firewall filter remove $r }

# Add rules — order matters, most permissive first
/ip firewall filter add chain=input action=accept connection-state=established,related comment="Tresa CHR: established input"
/ip firewall filter add chain=input action=accept protocol=udp dst-port=500,4500 comment="Tresa CHR: allow IKE NAT-T"
/ip firewall filter add chain=input action=accept protocol=udp dst-port=1701 ipsec-policy=in,ipsec comment="Tresa CHR: allow L2TP IPsec"
/ip firewall filter add chain=input action=accept protocol=ipsec-esp comment="Tresa CHR: allow ESP"
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=51847 comment="Tresa CHR: allow API"
/ip firewall filter add chain=input action=add-src-to-address-list protocol=tcp dst-port=51847 connection-state=new connection-limit=6,32 address-list=tresa_api_blacklist address-list-timeout=1d comment="Tresa CHR: API brute force"
/ip firewall filter add chain=input action=drop src-address-list=tresa_api_blacklist comment="Tresa CHR: drop API blacklist"
/ip firewall filter add chain=forward action=accept connection-state=established,related comment="Tresa CHR: established forward"
/ip firewall filter add chain=forward action=accept protocol=tcp dst-port=8728 connection-nat-state=dstnat comment="Tresa CHR: allow router API dstnat"

# Move Tresa rules ahead of any pre-existing blanket drop rules.
# Move in reverse desired order because every item is moved to position 0.
/ip firewall filter move [find where comment="Tresa CHR: allow router API dstnat"] 0
/ip firewall filter move [find where comment="Tresa CHR: established forward"] 0
/ip firewall filter move [find where comment="Tresa CHR: drop API blacklist"] 0
/ip firewall filter move [find where comment="Tresa CHR: API brute force"] 0
/ip firewall filter move [find where comment="Tresa CHR: allow API"] 0
/ip firewall filter move [find where comment="Tresa CHR: allow ESP"] 0
/ip firewall filter move [find where comment="Tresa CHR: allow L2TP IPsec"] 0
/ip firewall filter move [find where comment="Tresa CHR: allow IKE NAT-T"] 0
/ip firewall filter move [find where comment="Tresa CHR: established input"] 0

:put "Step 6: Done."

# ============================================================
# STEP 7 - VERIFY REQUIRED CHR COMPONENTS
# ============================================================
:put "Step 7: Verifying CHR configuration..."
:local verifyFailed false
:put (" RouterOS version : " . [/system resource get version])
:local apiUserId [/user find where name="tresachr"]
:if ([:len $apiUserId] = 0) do={
    :put " VERIFY FAILED: API user tresachr is missing or disabled."
    :set verifyFailed true
} else={
    :if ([/user get $apiUserId disabled] = true) do={
        :put " VERIFY FAILED: API user tresachr is disabled."
        :set verifyFailed true
    }
}
:if ([:len [/ip pool find where name="tresa-tunnel-pool"]] = 0) do={
    :put " VERIFY FAILED: tunnel pool is missing."
    :set verifyFailed true
}
:if ([:len [/ppp profile find where name="tresa-l2tp-profile"]] = 0) do={
    :put " VERIFY FAILED: PPP profile is missing."
    :set verifyFailed true
}
:if ([/interface l2tp-server server get enabled] != true) do={
    :put " VERIFY FAILED: L2TP server is disabled."
    :set verifyFailed true
}
:if ([/ip service get api disabled] = true) do={
    :put " VERIFY FAILED: API service is disabled."
    :set verifyFailed true
}
:if ([/ip service get api port] != 51847) do={
    :put " VERIFY FAILED: API service is not using port 51847."
    :set verifyFailed true
}
:if ([:len [/ip firewall filter find where comment="Tresa CHR: allow API"]] = 0) do={
    :put " VERIFY FAILED: API firewall rule is missing."
    :set verifyFailed true
}
:if ([:len [/ip firewall filter find where comment="Tresa CHR: allow IKE NAT-T"]] = 0) do={
    :put " VERIFY FAILED: IPsec firewall rule is missing."
    :set verifyFailed true
}
:if ($verifyFailed = true) do={
    :error "Tresa CHR verification failed"
}
:put "Step 7: All required CHR checks passed."

:put "================================================"
:put " TRESA CHR CONCENTRATOR IS READY"
:put " Public CHR       : 23.92.30.38"
:put " Backend API port : 51847"
:put " Tunnel subnet    : 10.0.0.0/16"
:put " L2TP security    : IPsec + MSCHAPv2"
:put " API user         : tresachr"
:put "================================================"
