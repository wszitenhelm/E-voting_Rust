use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::errors::ErrorCode;
use solana_program::hash::hash;

#[derive(Accounts)]
pub struct RevealVote<'info> {
    #[account(mut)]
    pub voter_pda: Account<'info, Voter>, // Voter account 
    #[account(mut, signer)]
    pub election: Account<'info, Election>, // Election account to access election ID and authority
    #[account(mut, signer)]
    pub user: Signer<'info>,
}

pub fn reveal_vote(ctx: Context<RevealVote>, encrypted_vote: Vec<u8>, nonce: Vec<u8>) -> Result<()> {
    let voter = &mut ctx.accounts.voter_pda;
    let election = &ctx.accounts.election;
    
    require!(!election.is_active, ErrorCode::ElectionStillActive);
    require!(voter.commitment != [0; 32], ErrorCode::VoteNotCommitted);
    require!(!voter.has_revealed, ErrorCode::VoteAlreadyRevealed);

    let computed_hash = hash(&[encrypted_vote, nonce].concat());

    // Compare computed hash with committed one
    require!(computed_hash.to_bytes() == voter.commitment.as_slice(), ErrorCode::InvalidVoteReveal);

    // Mark vote as revealed
    voter.has_revealed = true;
    
    Ok(())
}