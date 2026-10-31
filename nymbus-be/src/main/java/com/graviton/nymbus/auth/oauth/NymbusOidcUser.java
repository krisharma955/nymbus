package com.graviton.nymbus.auth.oauth;

import com.graviton.nymbus.user.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import java.util.Collection;

@Getter
public class NymbusOidcUser extends DefaultOidcUser {

    private final User user;

    public NymbusOidcUser(Collection<? extends GrantedAuthority> authorities,
                          OidcIdToken idToken,
                          OidcUserInfo userInfo,
                          String nameAttributeKey,
                          User user) {
        super(authorities, idToken, userInfo, nameAttributeKey);
        this.user = user;
    }

    public NymbusOidcUser(Collection<? extends GrantedAuthority> authorities,
                          OidcIdToken idToken,
                          String nameAttributeKey,
                          User user) {
        super(authorities, idToken, nameAttributeKey);
        this.user = user;
    }
}
