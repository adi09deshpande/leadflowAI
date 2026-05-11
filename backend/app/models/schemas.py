from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LeadStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    proposal = "proposal"
    closed_won = "closed_won"
    closed_lost = "closed_lost"


class LeadBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str
    email: EmailStr
    company: str
    title: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    revenue: Optional[str] = None
    status: LeadStatus = LeadStatus.new
    score: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    enriched: bool = False
    notes: Optional[str] = None

    @field_validator(
        "title",
        "phone",
        "location",
        "source",
        "linkedin",
        "website",
        "industry",
        "company_size",
        "revenue",
        "summary",
        "notes",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    status: Optional[LeadStatus] = None
    score: Optional[int] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
    enriched: Optional[bool] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    revenue: Optional[str] = None
    notes: Optional[str] = None


class Lead(LeadBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class LeadImport(BaseModel):
    leads: List[LeadCreate]


class CSVLeadImportRow(LeadBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EmailGenerateRequest(BaseModel):
    custom_context: Optional[str] = None


class EmailResponse(BaseModel):
    id: Optional[str] = None
    subject: str
    body: str
    tone: str
    sent: bool = False


class EmailSendRequest(BaseModel):
    email_id: Optional[str] = None
    subject: str
    body: str
    from_email: Optional[str] = None
    reply_to: Optional[str] = None


class EnrichResponse(BaseModel):
    lead: Lead
    enriched_fields: List[str]


class BulkEnrichRequest(BaseModel):
    ids: List[str]


class AIGenerateRequest(BaseModel):
    prompt: str
    context: Optional[dict] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class StatsResponse(BaseModel):
    total_leads: int
    new_this_week: int
    qualified: int
    conversion_rate: float
    emails_sent: int
    enriched: int
    pipeline_value: int
