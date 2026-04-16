import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId } = req.body;

        // 1. Fetch all drivers
        const { data: drivers, error: driversError } = await supabase.from('Users').select('*').eq('role', 'DRIVER');
        if (driversError) throw driversError;
        
        // 2. Fetch the target ticket
        const { data: targetTicket } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        const routeName = targetTicket?.route || '';
        const pickupArea = targetTicket?.pickupAreaCode || extractPickupArea(routeName);

        // 3. Fetch all tickets for history analysis
        const { data: allTickets } = await supabase.from('Tickets').select('*');

        // 4. Fetch dispatch logs for assignment history
        const { data: dispatchLogs } = await supabase.from('DispatchLogs').select('*');

        // === PRE-COMPUTE: Recent trips per driver (for load balancing) ===
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Count recent trips for ALL drivers to compute relative load
        const recentTripsMap = {};
        drivers.forEach(d => {
            const driverTickets = (allTickets || []).filter(t => 
                t.driverUsername === d.username || t.licensePlate === d.licensePlate
            );
            recentTripsMap[d.username] = driverTickets.filter(t => {
                if (!t.dateEnd) return false;
                return new Date(t.dateEnd) >= sevenDaysAgo;
            }).length;
        });
        
        // Find the max and average recent trips for normalization
        const allRecentCounts = Object.values(recentTripsMap);
        const maxRecentTrips = Math.max(...allRecentCounts, 1); // avoid division by 0

        // 5. Score each driver with FULL 5-criteria algorithm
        let candidates = drivers.map(d => {
            const driverTickets = (allTickets || []).filter(t => 
                t.driverUsername === d.username || t.licensePlate === d.licensePlate
            );
            
            // ═══════════════════════════════════════════════════
            // CRITERION 1: CONTINUITY (Tính liên tục) — Weight 0.40
            // Measures whether the driver's last completed trip
            // ends near the pickup location of this new ticket.
            // EXACT = same area → 100, NEAR = adjacent area → 60, WEAK = far → 20, NONE = no history → 0
            // ═══════════════════════════════════════════════════
            const completedTrips = driverTickets
                .filter(t => ['APPROVED', 'COMPLETED', 'ĐÃ HOÀN THÀNH'].includes(t.status || t.dispatchStatus))
                .sort((a, b) => new Date(b.dateEnd || 0) - new Date(a.dateEnd || 0));
            
            let continuityScore = 0;
            let continuityType = 'NONE';
            
            if (completedTrips.length > 0) {
                const lastTrip = completedTrips[0];
                const lastDropoff = lastTrip.dropoffAreaCode || extractDropoffArea(lastTrip.route || '');
                
                if (lastDropoff && pickupArea) {
                    if (lastDropoff === pickupArea) {
                        // EXACT: Driver's last drop-off IS the new pickup location
                        continuityScore = 100;
                        continuityType = 'EXACT';
                    } else if (areAreasNear(lastDropoff, pickupArea)) {
                        // NEAR: Within same region/zone
                        continuityScore = 60;
                        continuityType = 'NEAR';
                    } else {
                        // WEAK: Different area but has recent history
                        continuityScore = 20;
                        continuityType = 'WEAK';
                    }
                } else {
                    // Has history but no area data — give partial credit
                    continuityScore = 15;
                    continuityType = 'WEAK';
                }

                // === TIME DECAY PENALTY ===
                const targetStartDate = targetTicket?.dateStart || new Date().toISOString();
                if (lastTrip.dateEnd && targetStartDate) {
                    const lastEndDate = new Date(lastTrip.dateEnd);
                    const newStartDate = new Date(targetStartDate);
                    const diffHours = (newStartDate - lastEndDate) / (1000 * 60 * 60);

                    if (diffHours > 24) {
                        // Completely decayed (driver went home)
                        continuityScore = 0;
                        continuityType = 'NONE';
                    } else if (diffHours > 6) {
                        // Partial decay (driver has been waiting around)
                        continuityScore = Math.floor(continuityScore * 0.5);
                    }
                }
            }
            // If no completed trips at all, continuityScore stays 0, continuityType stays 'NONE'

            // ═══════════════════════════════════════════════════
            // CRITERION 2: AVAILABILITY (Khả dụng) — Weight 0.25
            // 3-tier system:
            //   - Actively transporting → 10 (nearly unavailable)
            //   - Assigned but pending response → 40 (minus 15 per extra pending)
            //   - Free → 100
            // ═══════════════════════════════════════════════════
            const transportingStatuses = ['DRIVER_ACCEPTED', 'IN_PROGRESS', 'ĐANG VẬN CHUYỂN'];
            const pendingStatuses = ['ĐÃ ĐIỀU XE', 'DRIVER_ASSIGNED', 'DRIVER_PENDING', 'ASSIGNED'];
            
            const isTransporting = driverTickets.some(t => transportingStatuses.includes(t.dispatchStatus || t.status));
            const pendingTickets = driverTickets.filter(t => pendingStatuses.includes(t.dispatchStatus || t.status));
            const pendingCount = pendingTickets.length;
            
            const waitingLogs = (dispatchLogs || []).filter(l => 
                l.assignedDriverId === d.username && l.responseStatus === 'WAITING'
            );

            // Check if any waiting log is older than 30 minutes
            const isSlowResponse = waitingLogs.some(l => {
                const elapsed = (Date.now() - new Date(l.timestamp).getTime()) / 60000;
                return elapsed > 30;
            });

            const totalPending = Math.max(pendingCount, waitingLogs.length);
            
            let availabilityScore;
            let availabilityLabel;
            if (isTransporting) {
                availabilityScore = 10;
                availabilityLabel = 'Đang vận chuyển';
            } else if (totalPending > 0) {
                // Each pending assignment reduces score further
                availabilityScore = Math.max(40 - ((totalPending - 1) * 15), 5);
                availabilityLabel = `Chờ phản hồi (${totalPending} phiếu)`;
            } else {
                availabilityScore = 100;
                availabilityLabel = 'Sẵn sàng';
            }
            const isBusy = isTransporting || totalPending > 0;
            
            // ═══════════════════════════════════════════════════
            // CRITERION 3: ROUTE EXPERIENCE (Kinh nghiệm tuyến) — Weight 0.15
            // How many times has this driver completed this exact route?
            // Formula: min(count * 10, 100) — reaches max at 10 trips
            // ═══════════════════════════════════════════════════
            const routeExpCount = driverTickets.filter(t => t.route === routeName).length;
            const routeExpScore = Math.min(routeExpCount * 10, 100);
            
            // ═══════════════════════════════════════════════════
            // CRITERION 4: PERFORMANCE (Hiệu suất) — Weight 0.10
            // Based on completed trips AND rejection history.
            // More completions = higher score; rejections penalize.
            // ═══════════════════════════════════════════════════
            const completedCount = driverTickets.filter(t => 
                ['APPROVED', 'COMPLETED', 'ĐÃ HOÀN THÀNH'].includes(t.status || t.dispatchStatus)
            ).length;
            
            // Check rejection history from dispatch logs
            const driverLogs = (dispatchLogs || []).filter(l => l.assignedDriverId === d.username);
            const rejectionCount = driverLogs.filter(l => l.responseStatus === 'REJECTED').length;
            const totalAssignments = driverLogs.length || 1; // avoid div by 0
            const acceptanceRate = 1 - (rejectionCount / totalAssignments);
            
            // Performance = base from completions + bonus from acceptance rate
            const completionBase = Math.min((completedCount / 30) * 70, 70); // up to 70 points from completions
            const acceptanceBonus = acceptanceRate * 30; // up to 30 points from acceptance rate
            const performanceScore = Math.min(Math.round(completionBase + acceptanceBonus), 100);

            // ═══════════════════════════════════════════════════
            // CRITERION 5: LOAD BALANCE (Cân bằng tải) — Weight 0.10
            // Drivers with FEWER recent trips get HIGHER scores.
            // This prevents one "star driver" from hogging all work.
            // Formula: 100 - (driverRecentTrips / maxRecentTrips * 100)
            // ═══════════════════════════════════════════════════
            const driverRecentTrips = recentTripsMap[d.username] || 0;
            const loadBalanceScore = Math.round(100 - (driverRecentTrips / maxRecentTrips) * 100);

            // ═══════════════════════════════════════════════════
            // FINAL WEIGHTED SCORE (Spec v2.0 weights)
            // Continuity:       40%
            // Availability:     25%
            // Route Experience: 15%
            // Performance:      10%
            // Load Balance:     10%
            // ═══════════════════════════════════════════════════
            const totalScore = 
                (continuityScore    * 0.40) +
                (availabilityScore  * 0.25) +
                (routeExpScore      * 0.15) +
                (performanceScore   * 0.10) +
                (loadBalanceScore   * 0.10);
            
            // Build reason text
            let reasonParts = [];
            reasonParts.push(availabilityLabel);
            if (continuityType === 'EXACT') reasonParts.push('Tiện đường (trùng điểm)');
            else if (continuityType === 'NEAR') reasonParts.push('Gần điểm lấy hàng');
            reasonParts.push(`${routeExpCount} chuyến tuyến này`);
            if (driverRecentTrips > 0) reasonParts.push(`${driverRecentTrips} chuyến/7 ngày`);

            return {
                id: d.username,
                driverId: d.username,
                name: d.name,
                driverName: d.name,
                licensePlate: d.licensePlate,
                phone: d.phone || '',
                score: Math.round(totalScore),
                reason: reasonParts.join(' · '),
                stats: { 
                    todayRevenue: driverTickets
                        .filter(t => t.dateEnd && t.dateEnd.startsWith(new Date().toISOString().split('T')[0]))
                        .reduce((sum, t) => sum + (t.revenue || 0), 0),
                    ticketsCount: completedCount,
                    routeExperience: routeExpCount
                },
                breakdown: {
                    continuity: continuityScore,
                    availability: availabilityScore,
                    routeExperience: routeExpScore,
                    performance: performanceScore,
                    loadBalance: loadBalanceScore
                },
                recentTrips: driverRecentTrips,
                routeExperience: routeExpCount,
                continuityType: continuityType,
                continuityBadge: continuityType === 'EXACT',
                expectedAvailableTime: availabilityLabel,
                isSlowResponse: isSlowResponse,
                expectedNextLocation: completedTrips.length > 0 
                    ? (completedTrips[0].dropoffAreaCode || extractDropoffArea(completedTrips[0].route || '') || 'N/A')
                    : 'Bãi đỗ',
                currentLocation: completedTrips.length > 0 
                    ? (completedTrips[0].dropoffAreaCode || extractDropoffArea(completedTrips[0].route || '') || 'Bãi đỗ')
                    : 'Bãi đỗ'
            };
        }).sort((a, b) => b.score - a.score);

        // === ELIGIBILITY FILTER ===
        // Separate out drivers who should NOT be candidates
        const rejectedCandidates = [];
        candidates = candidates.filter(c => {
            // Reject if driver has no license plate registered
            if (!c.licensePlate) {
                rejectedCandidates.push({
                    driverId: c.driverId,
                    driverName: c.driverName,
                    licensePlate: c.licensePlate || 'N/A',
                    rejectReasonCode: 'NO_VEHICLE',
                    reason: 'Chưa đăng ký biển số xe'
                });
                return false;
            }
            // Reject if driver has a REJECTED, NO_RESPONSE, WAITING, or REVOKED_SYSTEM log for THIS exact ticket
            const targetTicketLogs = (dispatchLogs || []).filter(l => l.ticketId === ticketId && l.assignedDriverId === c.driverId);
            const hasFailedAttempt = targetTicketLogs.some(l => 
                ['REJECTED', 'NO_RESPONSE', 'WAITING', 'REVOKED_SYSTEM'].includes(l.responseStatus)
            );
            
            if (hasFailedAttempt) {
                rejectedCandidates.push({
                    driverId: c.driverId,
                    driverName: c.driverName,
                    licensePlate: c.licensePlate || 'N/A',
                    rejectReasonCode: 'PREV_FAILED',
                    reason: 'Tài xế đã tự chối, bỏ qua, hoặc vừa bị thu hồi phiếu này'
                });
                return false;
            }

            // Reject if driver has an existing active trip that overlaps in time with this new ticket
            if (targetTicket?.dateStart && targetTicket?.dateEnd) {
                const driverActiveTrips = (allTickets || []).filter(t => 
                    (t.driverUsername === c.driverId || t.licensePlate === c.licensePlate) &&
                    ['DRIVER_ACCEPTED', 'IN_PROGRESS', 'ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE', 'DRIVER_ASSIGNED'].includes(t.dispatchStatus || t.status) &&
                    t.id !== ticketId
                );

                const newStart = new Date(targetTicket.dateStart);
                const newEnd = new Date(targetTicket.dateEnd);
                
                const hasOverlap = driverActiveTrips.some(activeTrip => {
                    if (!activeTrip.dateStart || !activeTrip.dateEnd) return false;
                    const activeStart = new Date(activeTrip.dateStart);
                    const activeEnd = new Date(activeTrip.dateEnd);
                    // Check strict overlap
                    return (newStart <= activeEnd) && (newEnd >= activeStart);
                });

                if (hasOverlap) {
                    rejectedCandidates.push({
                        driverId: c.driverId,
                        driverName: c.driverName,
                        licensePlate: c.licensePlate || 'N/A',
                        rejectReasonCode: 'OVERLAP',
                        reason: 'Đang kẹt chuyến khác trùng thời gian'
                    });
                    return false;
                }
            }

            return true;
        });

        return res.json({ candidates: candidates.slice(0, 3), rejectedCandidates });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Extract pickup area from route name.
 * Route format example: "Cảng Tiên Sa - Lao Bảo - Savannakhet"
 * Pickup is typically the first segment.
 */
function extractPickupArea(routeName) {
    if (!routeName) return null;
    const parts = routeName.split(/\s*[-–→]\s*/);
    if (parts.length > 0) {
        return normalizeArea(parts[0].trim());
    }
    return null;
}

/**
 * Extract dropoff area from route name.
 * Dropoff is typically the last segment.
 */
function extractDropoffArea(routeName) {
    if (!routeName) return null;
    const parts = routeName.split(/\s*[-–→]\s*/);
    if (parts.length > 1) {
        return normalizeArea(parts[parts.length - 1].trim());
    }
    return normalizeArea(parts[0]?.trim());
}

/**
 * Normalize area names for comparison.
 * Maps common variants to a canonical name.
 */
function normalizeArea(area) {
    if (!area) return null;
    const lower = area.toLowerCase();
    
    // Port areas (Cảng)
    if (lower.includes('tiên sa') || lower.includes('tien sa')) return 'TIEN_SA';
    if (lower.includes('liên chiểu') || lower.includes('lien chieu')) return 'LIEN_CHIEU';
    if (lower.includes('chu lai')) return 'CHU_LAI';
    if (lower.includes('quy nhơn') || lower.includes('quy nhon')) return 'QUY_NHON';
    if (lower.includes('chân mây') || lower.includes('chan may')) return 'CHAN_MAY';
    
    // Border gates (Cửa khẩu)
    if (lower.includes('lao bảo') || lower.includes('lao bao')) return 'LAO_BAO';
    if (lower.includes('bờ y') || lower.includes('bo y')) return 'BO_Y';
    if (lower.includes('la lay')) return 'LA_LAY';
    
    // Industrial zones
    if (lower.includes('hòa khánh') || lower.includes('hoa khanh')) return 'HOA_KHANH';
    if (lower.includes('điện nam') || lower.includes('dien nam') || lower.includes('điện ngọc') || lower.includes('dien ngoc')) return 'DIEN_NAM';
    if (lower.includes('vsip') || lower.includes('kcn')) return 'KCN_DANANG';
    if (lower.includes('dung quất') || lower.includes('dung quat')) return 'DUNG_QUAT';
    
    // Cities
    if (lower.includes('đà nẵng') || lower.includes('da nang') || lower.includes('danang')) return 'DANANG';
    if (lower.includes('huế') || lower.includes('hue')) return 'HUE';
    if (lower.includes('quảng trị') || lower.includes('quang tri')) return 'QUANG_TRI';
    if (lower.includes('quảng ngãi') || lower.includes('quang ngai')) return 'QUANG_NGAI';
    if (lower.includes('savannakhet') || lower.includes('lào') || lower.includes('lao')) return 'LAOS';
    
    // Fallback: use the cleaned string itself
    return area.toUpperCase().replace(/\s+/g, '_').substring(0, 30);
}

/**
 * Check if two areas are "near" each other (same zone/region).
 * Used for continuity scoring.
 */
function areAreasNear(area1, area2) {
    if (!area1 || !area2) return false;
    
    // Define regional groups
    const regions = [
        // Đà Nẵng metro
        ['TIEN_SA', 'LIEN_CHIEU', 'HOA_KHANH', 'KCN_DANANG', 'DANANG'],
        // Quảng Nam
        ['DIEN_NAM', 'CHU_LAI', 'DUNG_QUAT'],
        // Huế - Quảng Trị corridor
        ['HUE', 'CHAN_MAY', 'QUANG_TRI', 'LAO_BAO', 'LA_LAY'],
        // Southern
        ['QUY_NHON', 'QUANG_NGAI'],
        // Laos border
        ['LAO_BAO', 'LAOS'],
    ];
    
    for (const region of regions) {
        if (region.includes(area1) && region.includes(area2)) {
            return true;
        }
    }
    
    return false;
}
