use anchor_lang::prelude::*;

#[account]
pub struct Voter {
    pub voter_address: Pubkey, // public key of the voter user account, not the address of the Voter PDA account itself.
    pub has_committed: bool,
    pub has_revealed: bool,

    // commitment = hash(encrypted(vote + salt) + nonce)
    pub commitment: Vec<u8>, // Store the cryptographic commitment as a vector of bytes (e.g., SHA256 hash)

    // encrypted(vote + salt)
    pub encrypted_vote: Option<Vec<u8>>,

    pub vote: Option<bool>, // "Yes" = true, "No" = false, None = not voted

    pub voter_stake: u64,

    pub reveal_timestamp: Option<i64>, // Save exact time when revealed
    pub reveal_accepted: bool,
}

impl Voter {
    pub const LEN: usize = 8 + 32 + 1 + 1 + (4 + 32) + (4 + 32) + (1) + 8;
}