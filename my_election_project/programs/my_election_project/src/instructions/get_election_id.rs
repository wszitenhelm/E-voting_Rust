use anchor_lang::prelude::*;
use crate::state::Election;


#[derive(Accounts)]
pub struct GetElectionId<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
}

pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
    Ok(ctx.accounts.election.election_id.clone())
}