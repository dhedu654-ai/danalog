// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DanalogTransport
 * @dev Stores immutable records of approved transport tickets for the DANALOG logistics system.
 * Built for Anti Gravity (Monad) network.
 */
contract DanalogTransport {
    
    struct TransportRecord {
        string ticketId;        // Unique internal ID of the ticket
        string customerId;      // Customer ID for grouping/indexing
        bytes32 dataHash;       // Hash of critical data (Route, Revenue, Salary, etc.)
        uint256 revenue;        // Approved Revenue
        uint256 salary;         // Approved Driver Salary
        address approvedBy;     // CS Staff wallet address
        uint256 approvalTime;   // Timestamp of approval
    }

    // Mapping from Ticket ID to Record
    mapping(string => TransportRecord) public records;
    
    // Check if a ticket ID has already been recorded
    mapping(string => bool) public isRecorded;

    event TicketApproved(
        string indexed ticketId, 
        string indexed customerId,
        address indexed approvedBy, 
        uint256 timestamp, 
        uint256 revenue
    );

    /**
     * @dev Approves a ticket and records it permanently on-chain.
     * @param _ticketId Unique Ticket ID.
     * @param _customerId Customer ID for reporting.
     * @param _dataHash Hash of the ticket content (prevents tampering).
     * @param _revenue Calculated revenue for the trip.
     * @param _salary Calculated driver salary for the trip.
     */
    function approveTicket(
        string memory _ticketId, 
        string memory _customerId,
        bytes32 _dataHash, 
        uint256 _revenue,
        uint256 _salary
    ) external {
        require(!isRecorded[_ticketId], "Ticket already approved and recorded.");

        TransportRecord memory newRecord = TransportRecord({
            ticketId: _ticketId,
            customerId: _customerId,
            dataHash: _dataHash,
            revenue: _revenue,
            salary: _salary,
            approvedBy: msg.sender,
            approvalTime: block.timestamp
        });

        records[_ticketId] = newRecord;
        isRecorded[_ticketId] = true;

        emit TicketApproved(_ticketId, _customerId, msg.sender, block.timestamp, _revenue);
    }

    /**
     * @dev Verify if a local ticket matches the on-chain record.
     * @param _ticketId Ticket ID to check.
     * @param _localDataHash Hash of the local data to verify.
     */
    function verifyTicket(string memory _ticketId, bytes32 _localDataHash) external view returns (bool) {
        require(isRecorded[_ticketId], "Ticket not found.");
        return records[_ticketId].dataHash == _localDataHash;
    }
}
