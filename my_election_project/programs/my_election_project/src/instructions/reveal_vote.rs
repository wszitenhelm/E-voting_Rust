use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::errors::ErrorCode;
use solana_program::hash::hash;

#[derive(Accounts)]
pub struct RevealVote<'info> {
    #[account(mut)]
    pub voter_pda: Account<'info, Voter>, // Voter account 
    #[account(mut)]
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

    let clock = Clock::get()?;

    msg!("Reveal end time is: {:?}", election.reveal_end_time);

    // Check if reveal is within the allowed time
    if let Some(reveal_end_time) = election.reveal_end_time {
        if clock.unix_timestamp > reveal_end_time {
            msg!("Reveal was too late: {}", clock.unix_timestamp);
            voter.reveal_accepted = false;
        } else {
            voter.reveal_accepted = true;
        }
    } else {
        return err!(ErrorCode::RevealPhaseNotStarted);
    }

    let vote_copy = encrypted_vote.clone(); // If you want to use it multiple times

    let computed_hash = hash(&[vote_copy, nonce].concat());

    // Compare computed hash with committed one
    require!(computed_hash.to_bytes() == voter.commitment.as_slice(), ErrorCode::InvalidVoteReveal);

    // Mark vote as revealed
    voter.encrypted_vote = Some(encrypted_vote);
    voter.has_revealed = true;
    voter.reveal_timestamp = Some(clock.unix_timestamp);
    
    Ok(())
}