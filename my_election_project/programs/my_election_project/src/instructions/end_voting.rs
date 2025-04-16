use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct EndVoting<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
}

pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
    let election = &mut ctx.accounts.election;

    if !election.is_active {
        return Err(ErrorCode::VotingNotActive.into());
    }

    // Ensure only the admin can end the election
    if election.admin != *ctx.accounts.user.key {
        return Err(ErrorCode::Unauthorized.into());
    }

    let clock = Clock::get()?;

    //require!(clock.unix_timestamp >= election.commit_end_time.unwrap(), ErrorCode::CommitPhaseNotEnded);

    election.is_active = false;
    election.votes_committed = true;
    
    msg!("Setting reveal_end_time at: {}", clock.unix_timestamp);
    
    let reveal_end_time = clock.unix_timestamp
        .checked_add(election.reveal_duration as i64)
        .ok_or(ErrorCode::Overflow)?;
    
    election.reveal_end_time = Some(reveal_end_time);
    
    msg!("Reveal end time set to: {}", reveal_end_time);
    msg!("Election ended successfully.");

    Ok(())
}