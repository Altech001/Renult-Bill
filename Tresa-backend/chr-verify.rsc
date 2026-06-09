# TRESA BILL CHR VERIFICATION
# Upload and import this file after bootstrap or whenever diagnosing tunnels.

:put "================================================"
:put " TRESA CHR VERIFICATION"
:put "================================================"
:put ("RouterOS version: " . [/system resource get version])

:put "--- API USER ---"
/user print detail where name="tresachr"

:put "--- API SERVICE ---"
/ip service print detail where name="api"

:put "--- L2TP SERVER ---"
/interface l2tp-server server print

:put "--- PPP PROFILE AND POOL ---"
/ppp profile print detail where name="tresa-l2tp-profile"
/ip pool print detail where name="tresa-tunnel-pool"

:put "--- ACTIVE PPP/L2TP SESSIONS ---"
/ppp active print detail
/interface l2tp-server print detail

:put "--- TRESA FIREWALL RULE ORDER AND COUNTERS ---"
/ip firewall filter print stats detail where comment~"Tresa CHR:"

:put "--- CUSTOMER NAT RULES ---"
/ip firewall nat print stats detail where comment~"customer:"

:local failed false
:local apiUserId [/user find where name="tresachr"]
:if ([:len $apiUserId] = 0) do={
    :put "FAILED: API user is missing or disabled."
    :set failed true
} else={
    :if ([/user get $apiUserId disabled] = true) do={
        :put "FAILED: API user is disabled."
        :set failed true
    }
}
:if ([/ip service get api disabled] = true) do={
    :put "FAILED: API service is disabled."
    :set failed true
}
:if ([/ip service get api port] != 51847) do={
    :put "FAILED: API service is not on port 51847."
    :set failed true
}
:if ([/interface l2tp-server server get enabled] != true) do={
    :put "FAILED: L2TP server is disabled."
    :set failed true
}
:if ([:len [/ip pool find where name="tresa-tunnel-pool"]] = 0) do={
    :put "FAILED: tunnel pool is missing."
    :set failed true
}
:if ([:len [/ppp profile find where name="tresa-l2tp-profile"]] = 0) do={
    :put "FAILED: tunnel PPP profile is missing."
    :set failed true
}
:if ($failed = true) do={
    :error "Tresa CHR verification failed"
}

:put "BASE CHR CHECKS PASSED."
:put "NOTE: Each working customer must also appear in /ppp active"
:put "      and have a matching customer:<username> NAT rule."
:put "================================================"
