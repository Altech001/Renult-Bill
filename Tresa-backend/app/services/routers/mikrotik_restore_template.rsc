# ============================================================
# RENULT BILLING SCRIPT FULL RESTORE SCRIPT
# RouterOS 7.x
# Run this after a factory reset to restore full config
# ============================================================

# ============================================================
# 1. RENAME INTERFACES
# ============================================================
/interface ethernet
set [find default-name=ether1] name=ether1-ISP
set [find default-name=ether2] name=ether2-HOTSPOT/PPPOE
set [find default-name=ether3] name=ether3-CONFIG
set [find default-name=ether4] name=ether4-HOTSPOT/PPPOE
set [find default-name=ether5] name=ether5-HOTSPOT/PPPOE

# ============================================================
# 2. BRIDGE SETUP
# ============================================================
/interface bridge
add name=renult_bridge_hotspot protocol-mode=rstp fast-forward=yes

/interface bridge port
add bridge=renult_bridge_hotspot interface=ether2-HOTSPOT/PPPOE hw=yes
add bridge=renult_bridge_hotspot interface=ether4-HOTSPOT/PPPOE hw=yes
add bridge=renult_bridge_hotspot interface=ether5-HOTSPOT/PPPOE hw=yes
add bridge=renult_bridge_hotspot interface=wlan1

# ============================================================
# 3. IP ADDRESSING
# ============================================================
/ip address
add address=172.16.0.1/24 interface=renult_bridge_hotspot

# ============================================================
# 4. IP POOLS
# ============================================================
/ip pool
add name=pppoe_pool ranges=172.16.0.2-172.16.0.254
add name=hotspot_pool ranges=172.16.0.2-172.16.0.254

# ============================================================
# 5. PPP PROFILE
# ============================================================
/ppp profile
add name=10MBPS \
    local-address=172.16.0.1 \
    remote-address=pppoe_pool \
    rate-limit="2M/2M" \
    dns-server=8.8.8.8,8.8.4.4 \
    wins-server=8.8.4.4 \
    use-ipv6=yes \
    change-tcp-mss=default \
    only-one=default

# ============================================================
# 6. PPP SECRETS (USERS)
# ============================================================
/ppp secret
add name=admin    password=admin   service=pppoe profile=20MBPS
add name=renult   password=renult  service=pppoe profile=20MBPS

# ============================================================
# 7. PPPOE SERVER (MikroTik serves Tenda and other clients)
# ============================================================
/interface pppoe-server server
add service-name=PPPOE \
    interface=renult_bridge_hotspot \
    authentication=pap,chap,mschap1,mschap2 \
    keepalive-timeout=10 \
    one-session-per-host=yes \
    max-sessions=unlimited \
    default-profile=default \
    accept-untagged=yes

# ============================================================
# 8. PPPOE CLIENT (MikroTik dials upstream ISP on ether1)
# NOTE: Update user/password below to your real ISP credentials
# ============================================================
/interface pppoe-client
add name=pppoe-out1 \
    interface=ether1-ISP \
    user="renult" \
    password="renult" \
    profile=20MBPS \
    add-default-route=yes \
    default-route-distance=1 \
    keepalive-timeout=10 \
    use-peer-dns=no \
    dial-on-demand=no \
    allow=pap,chap,mschap1,mschap2 \
    disabled=no

# ============================================================
# 9. NAT MASQUERADE (allows clients to reach internet)
# ============================================================
/ip firewall nat
add chain=srcnat action=masquerade out-interface=ether1-ISP

# ============================================================
# 10. DNS
# ============================================================
/ip dns
set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes

# ============================================================
# DONE
# Tenda WAN PPPoE credentials:
#   Username : renult
#   Password : renult
# ============================================================


