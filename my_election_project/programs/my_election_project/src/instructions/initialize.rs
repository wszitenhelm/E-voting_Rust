use anchor_lang::prelude::*;
use crate::state::Election;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds = [b"election", user.key().as_ref()], bump, payer = user, space = 8 + 64 + 8 + 8 + 32 + (8 + 64) * 2 + 32)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>, election_name: String, voting_authority: Pubkey, election_id: String) -> Result<()> {
    let election = &mut ctx.accounts.election;
    election.name = election_name;
    election.is_active = false;
    election.votes_committed = false;
    election.votes_revealed = false;
    election.admin = *ctx.accounts.user.key;
    election.voting_authority = voting_authority;
    election.election_id = election_id;
    election.va_encryption_key = Pubkey::default();
    election.yes_votes = 0;
    election.no_votes = 0;
    Ok(())
}