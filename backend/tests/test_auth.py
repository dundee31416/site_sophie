from src.config.settings import settings


def test_login_ok_sets_cookie(client, author):
    res = client.post("/api/auth/login", json={"username": "sophie", "password": "test-password"})
    assert res.status_code == 200
    assert res.json()["username"] == "sophie"
    assert settings.COOKIE_NAME in res.cookies


def test_login_wrong_password(client, author):
    res = client.post("/api/auth/login", json={"username": "sophie", "password": "nope"})
    assert res.status_code == 401


def test_login_unknown_user(client):
    res = client.post("/api/auth/login", json={"username": "ghost", "password": "x"})
    assert res.status_code == 401


def test_me_requires_cookie(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_session(logged_in):
    res = logged_in.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["username"] == "sophie"


def test_garbage_token_is_401_not_500(client, author):
    client.cookies.set(settings.COOKIE_NAME, "not-a-jwt")
    assert client.get("/api/auth/me").status_code == 401


def test_token_with_non_numeric_sub_is_401(client, author):
    import jwt as pyjwt

    token = pyjwt.encode(
        {"sub": "not-an-int", "role": "author"},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    client.cookies.set(settings.COOKIE_NAME, token)
    assert client.get("/api/auth/me").status_code == 401
