#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("8bP99pZpRyWi7np5oe5uvxfsByNQscFdbwPxhrzuf75i"); // Temporary for testing.

#[program]
mod voting_program {
    use super::*; // bring everything from the parent module into scope

    pub fn initialize(
        ctx: Context<Initialize>,
        election_name: String,
        voting_authority: Pubkey,
        election_id: String,
    ) -> Result<()> {
        // &mut created mutable reference to modify election account
        let election = &mut ctx.accounts.election;
        election.name = election_name;
        election.is_active = false;
        election.votes_committed = false;
        election.votes_revealed = false;

        election.admin = *ctx.accounts.user.key; // Set the admin to the user calling the function
        election.voting_authority = voting_authority;

        election.election_id = election_id;

        // Initialize vote options inside the election account
        election.votes = vec![
            VoteOption {
                name: "yes".to_string(),
                vote_count: 0,
            },
            VoteOption {
                name: "no".to_string(),
                vote_count: 0,
            },
        ];

        // Initialize RegisteredVoters account with public keys of voters not voter PDA
        let registered_voters = &mut ctx.accounts.registered_voters;
        registered_voters.registered_addresses = Vec::new(); // Start with an empty list of registered voters

        // Set the registered_voters field to the public key of the registered_voters account
        election.registered_voters = ctx.accounts.registered_voters.key(); // Link RegisteredVoters account to Election

        Ok(())
    }

    pub fn start_voting(ctx: Context<StartVoting>) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let user = &ctx.accounts.user;

        check_admin(&election, user)?;

        election.is_active = true;

        Ok(())
    }

    pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let user = &ctx.accounts.user;

        // Ensure that the user calling the function is the admin
        if election.admin != *user.key {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Check that the results have been committed before ending the voting
        //if !election.results_committed {
        //return Err(ErrorCode::ResultsNotCommitted.into());
        //}

        election.is_active = false;

        Ok(())
    }

    pub fn register_voter(
        ctx: Context<RegisterVoter>,
        voter_public_key: Pubkey,
        voter_stake: u64,
    ) -> Result<()> {
        // pass election to check if it's active as registering only before it's active
        let election = &mut ctx.accounts.election;
        let registered_voters = &mut ctx.accounts.registered_voters;

        // Ensure election is not active
        if election.is_active {
            return Err(ErrorCode::VotingAlreadyStarted.into());
        }

        // Ensure the user calling the function is the voting authority (VA)
        let user = &ctx.accounts.user;
        if election.voting_authority != *user.key {
            return Err(ErrorCode::Unauthorized.into()); // Ensure only the VA can register voters
        }

        // Check if the voter is already registered
        if registered_voters
            .registered_addresses
            .contains(&voter_public_key)
        {
            return Err(ErrorCode::VoterAlreadyRegistered.into());
        }

        let voter: &mut Account<'_, Voter> = &mut ctx.accounts.voter;

        // Ensure PDA is correctly derived (for debugging & verification)
        let (expected_voter_pda, _bump) =
            Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], &crate::ID);

        if expected_voter_pda != voter.key() {
            return Err(ErrorCode::InvalidPDA.into());
        }

        // Prevent re-initialization attack
        if voter.voter_address != Pubkey::default() {
            return Err(ErrorCode::VoterAlreadyRegistered.into());
        }

        // Initialize the voter's account with default values (commitment, vote, etc.)
        let registered_voter = &mut ctx.accounts.voter;
        registered_voter.voter_address = voter_public_key; // Voter's public key
        registered_voter.has_committed = false;
        registered_voter.has_revealed = false;
        registered_voter.commitment = Vec::new(); // Empty commitment at the start
        registered_voter.vote = None; // No vote cast initially
        registered_voter.voter_stake = voter_stake;

        // Add voter to registered voters list
        registered_voters
            .registered_addresses
            .push(voter_public_key);       

        Ok(())
    }

    pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
        let election = &ctx.accounts.election;
        Ok(election.election_id.clone()) // Return election_id
    }

}

pub fn check_admin(election: &Election, user: &Signer) -> Result<()> {
    if election.admin != *user.key {
        return Err(ErrorCode::Unauthorized.into());
    }
    Ok(())
}



#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds = [b"election", user.key().as_ref()], bump, payer = user, space = 8 + 64 + 8 + 8 + 32 + (8 + 64) * 2 + 32)]
    pub election: Account<'info, Election>,
    #[account(init, payer = user, space = 8 + 8 + 32, seeds = [b"registered_voters", election.key().as_ref()], bump)]
    pub registered_voters: Account<'info, RegisteredVoters>, // Account for storing registered voters
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartVoting<'info> {
    // has_one = admin to ensure that the election can only be started by admin
    #[account(mut)]
    pub election: Account<'info, Election>, // The election being activated
    #[account(mut, signer)] // The signer (admin) who can activate the election
    pub user: Signer<'info>, // The user triggering the voting start (admin)
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndVoting<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(voter_public_key: Pubkey)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>, // The election account
    #[account(mut)]
    pub registered_voters: Account<'info, RegisteredVoters>, // Account holding registered voters
    // NEED TO BE PASSED AND CAN'T BE JUST TAKEN FROM REFERENCE IN ELECTION BECAUSE it is being modified and in Rust
    // you pass all accounts that are modified
    // oh so in Election it's Pubkey as its only reference and in Register it's actually account because it's being modified
    #[account(init_if_needed, payer = user, space = 8 + 64, seeds = [b"voter", voter_public_key.as_ref()], bump)]
    pub voter: Account<'info, Voter>, // Voter account
    #[account(mut, signer)]
    pub user: Signer<'info>, // The user registering the voter (Voting Authority)
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetElectionId<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    pub user: Signer<'info>,
}

#[account]
pub struct Election {
    pub election_id: String, // Randomly generated election ID
    pub name: String,
    pub is_active: bool,
    pub votes_committed: bool,
    pub votes_revealed: bool,
    pub admin: Pubkey,          // Store the admin's public key
    pub votes: Vec<VoteOption>, // Store all options in a single account
    pub voting_authority: Pubkey,
    pub registered_voters: Pubkey, // Single reference to the RegisteredVoters account
}

#[account]
pub struct Voter {
    pub voter_address: Pubkey, // public key of the voter user account, not the address of the Voter PDA account itself.
    pub has_committed: bool,
    pub has_revealed: bool,
    pub commitment: Vec<u8>, // Store the cryptographic commitment as a vector of bytes (e.g., SHA256 hash)
    pub vote: Option<VoteOption>, // Can store the vote option name
    pub voter_stake: u64,
}

#[account]
pub struct RegisteredVoters {
    pub registered_addresses: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VoteOption {
    pub name: String,
    pub vote_count: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Voting has already started.")]
    VotingAlreadyStarted,

    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("The results must be committed before ending the voting.")]
    ResultsNotCommitted,

    #[msg("This voter is already registered.")]
    VoterAlreadyRegistered,

    #[msg("PDA not correct for Voter account.")]
    InvalidPDA,

    #[msg("Invalid signature")]
    InvalidSignature,

    #[msg("Invalid Public Key")]
    InvalidPublicKey,
}