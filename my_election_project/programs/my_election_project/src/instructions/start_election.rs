use anchor_lang::prelude::*;
use solana_program::sysvar::clock::Clock;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct StartElection<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
}

pub fn start_election(ctx: Context<StartElection>) -> Result<()> {
    let election = &mut ctx.accounts.election;
    let user = &ctx.accounts.user;

    // Ensure that the user calling the function is the admin
    if election.admin != *user.key {
        return Err(ErrorCode::Unauthorized.into());
    }

    if election.is_active {
        return Err(ErrorCode::VotingAlreadyStarted.into());
    }

    let clock = Clock::get()?;
    election.commit_end_time = Some(clock.unix_timestamp + election.commit_duration as i64);

    election.is_active = true;
    Ok(())
}