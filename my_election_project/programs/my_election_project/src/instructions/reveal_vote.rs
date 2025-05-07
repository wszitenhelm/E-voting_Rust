use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::errors::ErrorCode;
use solana_program::hash::hash;

// Define an event to be emitted when the vote is revealed successfully
#[event]
pub struct VoteRevealed {
    pub voter: Pubkey,
    pub encrypted_vote: Vec<u8>,
    pub message: String,
}

#[event]
pub struct VoteAcceptedOrNot {
    pub voter: Pubkey,
    pub vote_accepted: bool,
    pub message: String,
}

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

    let vote_copy = encrypted_vote.clone(); // If you want to use it multiple times

    let hash_input = [vote_copy.clone(), nonce].concat();
    let computed_hash = hash(&hash_input);  

    // Compare computed hash with committed one
    require!(computed_hash.to_bytes() == voter.commitment.as_slice(), ErrorCode::InvalidVoteReveal);

    let clock = Clock::get()?;

    msg!("Reveal end time is: {:?}", election.reveal_end_time);

        // Check if the reveal is within the allowed time
        let mut vote_accepted = true;
        let mut acceptance_message = "Vote accepted.".to_string();

    // Check if reveal is within the allowed time
    // if let Some(reveal_end_time) = election.reveal_end_time {
    //     if clock.unix_timestamp > reveal_end_time {
    //         msg!("Reveal was too late: {}", clock.unix_timestamp);
    //         voter.reveal_accepted = false;
    //         vote_accepted = false;
    //         acceptance_message = "Vote revealed too late and will not be accepted.".to_string();
    //         msg!("Vote confirmed, but it was too late and will not be accepted.");
    //     } else {
    //         voter.reveal_accepted = true;
    //         msg!("Vote successfully revealed and accepted.");
    //     }
    // } else {
    //     return err!(ErrorCode::RevealPhaseNotStarted);
    // }

        // Emit the VoteRevealed event
        emit!(VoteRevealed {
            voter: voter.key(),
            encrypted_vote: vote_copy,
            message: "Vote successfully revealed.".to_string(),
        });
    
        // Emit the VoteAcceptedOrNot event
        emit!(VoteAcceptedOrNot {
            voter: voter.key(),
            vote_accepted,
            message: acceptance_message,
        });

        
    // Mark vote as revealed
    voter.encrypted_vote = Some(encrypted_vote);
    voter.has_revealed = true;
    voter.reveal_timestamp = Some(clock.unix_timestamp);
    
    Ok(())
}