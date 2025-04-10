use anchor_lang::prelude::*;

#[account]
pub struct Election {
    pub election_id: String,      // Randomly generated election ID
    pub name: String,             // Election name
    pub is_active: bool,          // Is the election currently active?

    pub votes_committed: bool,    // Have votes been committed?
    pub votes_revealed: bool,     // Have votes been revealed?
    
    pub admin: Pubkey,            // Admin's public key
    pub voting_authority: Pubkey, // Authority responsible for managing voting

    pub va_encryption_key: Pubkey,

    // Direct vote counters
    pub yes_votes: u64,        // Count of "Yes" votes
    pub no_votes: u64,         // Count of "No" votes

    pub commit_duration: u64,  // How long commit phase lasts (in seconds)
    pub reveal_duration: u64,  // How long reveal phase lasts (in seconds)
    pub commit_end_time: Option<i64>, // Timestamp when commit phase ends
    pub reveal_end_time: Option<i64>, // Timestamp when reveal phase ends
}

impl Election {
    pub const LEN: usize = 8 + (4 + 64) + (4 + 64) + 1 + 1 + 1 + 32 + 32 + 8 + 8;
}