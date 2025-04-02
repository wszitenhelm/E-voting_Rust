#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use solana_program::{
    account_info::AccountInfo,
    sysvar::Sysvar,
    program_error::ProgramError,
};

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
        // Access accounts
        //  extract voting_authority into a variable before borrowing election mutably:
        let voting_authority = ctx.accounts.election.voting_authority.key(); // Immutable borrow
        let election = &mut ctx.accounts.election;
        let registered_voters = &mut ctx.accounts.registered_voters;
        let instructions = &ctx.accounts.instructions_sysvar;
    
        // Ensure election is not active
        if election.is_active {
            return Err(ErrorCode::VotingAlreadyStarted.into());
        }
    
        // Ensure the user calling the function is the Voting Authority (VA)
        let user = &ctx.accounts.user;
        if election.voting_authority != *user.key {
            return Err(ErrorCode::Unauthorized.into());
        }
    
        // Check if the voter is already registered
        if registered_voters
            .registered_addresses
            .contains(&voter_public_key)
        {
            return Err(ErrorCode::VoterAlreadyRegistered.into());
        }
    
        // Verify the signature using the helper function
        verify_signature(instructions, &voting_authority, &voter_public_key, voter_stake, &election.election_id)?;

        // Register the voter after verification
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
    
        // Initialize the voter's account with default values
        voter.voter_address = voter_public_key;
        voter.has_committed = false;
        voter.has_revealed = false;
        voter.commitment = Vec::new();
        voter.vote = None;
        voter.voter_stake = voter_stake;
    
        // Add voter to registered voters list
        registered_voters
            .registered_addresses
            .push(voter_public_key);
    
        Ok(())
    }
    

    pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
        let election = &ctx.accounts.election;
        Ok(election.election_id.clone()) // Return election_id // needs cloning as String dont implement Copy trait 
    }

    pub fn get_voting_authority(ctx: Context<GetVotingAuthority>) -> Result<Pubkey> {
        let election = &ctx.accounts.election;
        Ok(election.voting_authority) // doesn't need cloning as Pubkey implementes Copy 
    }

}

pub fn check_admin(election: &Election, user: &Signer) -> Result<()> {
    if election.admin != *user.key {
        return Err(ErrorCode::Unauthorized.into());
    }
    Ok(())
}

pub fn verify_signature(
    instructions: &AccountInfo,
    expected_signer: &Pubkey,
    voter_public_key: &Pubkey,
    voter_stake: u64,
    election_id: &str,
) -> Result<bool> {
    // Loop through all instructions to find an Ed25519SigVerify instruction
    let mut signature_verified = false;
    for i in 0..instructions.data_len() {
        let instruction = match solana_program::sysvar::instructions::load_instruction_at_checked(i, instructions) {
            Ok(instr) => instr,
            Err(_) => continue, // Skip if instruction can't be loaded
        };

        // Ensure it's an Ed25519SigVerify instruction
        if instruction.program_id != solana_program::ed25519_program::id() {
            continue;
        }

        let sig_data = &instruction.data;

        // Ensure signature data length is valid
        if sig_data.len() < 96 {
            msg!("Error: Signature data too short!");
            return Err(ProgramError::InvalidInstructionData.into());
        }

        // Extract the public key that signed the message
        let signed_pubkey = Pubkey::from(<[u8; 32]>::try_from(&sig_data[64..96]).unwrap());

        // Ensure the public key matches the expected signer (Voting Authority)
        if signed_pubkey != *expected_signer {
            msg!("Error: Signature is not from the expected Voting Authority!");
            return Err(ProgramError::InvalidInstructionData.into());
        }

        // Extract the signed message (skip signature, public key, and padding)
        let signed_message = &sig_data[96..];

        let mut expected_message = Vec::new();
        expected_message.extend_from_slice(&voter_public_key.to_bytes()); // 32 bytes
        expected_message.extend_from_slice(&voter_stake.to_le_bytes());   // 8 bytes
        expected_message.extend_from_slice(election_id.as_bytes());

        // Verify the signed message
        if signed_message != expected_message {
            msg!("Error: Signature does not match expected message!");
            return Err(ProgramError::InvalidInstructionData.into());
        }

        msg!("Verified Ed25519 signature from Voting Authority!");
        signature_verified = true;
        break; // Exit loop after verification
    }

    // If no valid signature was found, return an error
    if !signature_verified {
        msg!("Error: No valid Ed25519SigVerify instruction found!");
        return Err(ProgramError::InvalidInstructionData.into());
    }

    Ok(true)
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
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GetElectionId<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    //pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetVotingAuthority<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
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
    //pub encrypted_
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